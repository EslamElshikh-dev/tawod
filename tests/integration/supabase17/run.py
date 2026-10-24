"""Real PostgreSQL 17.6 + GoTrue + PostgREST, with disposable data only.

Runs on a local Docker host or a free standard runner for this public repository.
There is no managed project URL, API key, production data, or billable resource.
Auth schema/users/sessions come from GoTrue itself; application SQL is unmodified
apart from replacing scheduling/network extensions with no-op local fixtures.
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ["docker", "compose", "-f", str(Path(__file__).with_name("compose.yml"))]
JWT_SECRET = b"isolated-acceptance-jwt-only-never-production-69"
RESULTS = []


def command(*args, data=None):
    return subprocess.run(args, input=data, text=True, capture_output=True, check=True).stdout


def sql(query):
    return command(*COMPOSE, "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres",
                   "-v", "ON_ERROR_STOP=1", "-At", data=query).strip()


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    RESULTS.append(name)
    print("PASS " + name, flush=True)


def request(service, path, method="GET", data=None, token=None, expected=(200,), headers=None):
    port = {"auth": 19999, "rest": 13000}[service]
    url = f"http://127.0.0.1:{port}/{path}"
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, method=method, headers=h,
                                 data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    body = json.loads(raw) if raw else None
    if status not in expected:
        code = body.get("code", body.get("error_code")) if isinstance(body, dict) else None
        raise AssertionError(f"{service} {method} {path}: HTTP {status}, code {code}; expected {expected}")
    return body


def ready(service, path):
    for _ in range(60):
        try:
            request(service, path)
            return
        except (OSError, AssertionError):
            time.sleep(1)
    raise RuntimeError(service + " did not become ready")


def local_service_jwt():
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")
    payload = {"role": "service_role", "iss": "supabase", "iat": int(time.time()), "exp": int(time.time()) + 3600}
    unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode(payload)
    sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET, unsigned, hashlib.sha256).digest()).rstrip(b"=")
    return (unsigned + b"." + sig).decode()


def denied(name, path, token=None, method="GET", data=None, headers=None):
    body = request("rest", path, method, data, token, (401, 403), headers)
    check(name, body["code"] == "42501")


def rpc(name, payload=None, token=None, expected=(200,)):
    return request("rest", "rpc/" + name, "POST", payload or {}, token, expected)


def workspace(action, payload=None, actor="admin", token=None, expected=(200,)):
    return rpc("tawod_maintenance_workspace", {
        "p_action": action, "p_payload": payload or {}, "p_actor": actor
    }, token, expected)


def application_error(name, callback, expected_code, expected_message):
    body = callback()
    check(name, body["code"] == expected_code and expected_message in body["message"])


def main():
    subprocess.run([*COMPOSE, "up", "-d", "--wait", "db"], check=True)
    check("real PostgreSQL 17.6", sql("show server_version;").startswith("17.6"))
    helper = (ROOT / "tests/helpers/supabase-postgres.mjs").read_text()
    bootstrap = helper.split("await db.exec(" + chr(96), 1)[1].split(chr(96) + ");", 1)[0]
    bootstrap = re.sub(r"create table auth\.users\s*\([\s\S]*?\);", "", bootstrap)
    assert "create table auth.users" not in bootstrap
    sql(bootstrap + "\ncreate role authenticator login noinherit password 'isolated-acceptance-rest-only';"
        "grant anon,authenticated,service_role to authenticator;")
    subprocess.run([*COMPOSE, "up", "-d", "auth"], check=True)
    ready("auth", "health")
    check("GoTrue installed real users sessions and refresh tokens", sql(
        "select to_regclass('auth.users') is not null and to_regclass('auth.sessions') is not null "
        "and to_regclass('auth.refresh_tokens') is not null;") == "t")
    check("empty application schema", sql("select count(*) from pg_tables where schemaname='public';") == "0")

    files = sorted((ROOT / "supabase/migrations").glob("*.sql"))
    for file in files:
        source = re.sub(r"create\s+extension\s+if\s+not\s+exists\s+(?:pg_cron|pg_net)(?:\s+with\s+schema\s+\w+)?\s*;",
                        "-- Scheduling/network is isolated local scaffolding.", file.read_text(), flags=re.I)
        try:
            sql(source)
        except subprocess.CalledProcessError as error:
            raise RuntimeError(f"Migration {file.name}: {error.stderr}") from error
    check("all 29 migrations replay on PostgreSQL 17.6", len(files) == 29)
    check("22 application tables have RLS", sql(
        "select count(*)=22 and bool_and(rowsecurity) from pg_tables where schemaname='public';") == "t")
    check("six maintenance tables have RLS", sql(
        "select count(*)=6 and bool_and(rowsecurity) from pg_tables where schemaname='public' "
        "and tablename like 'tawod_maintenance_%';") == "t")
    check("browser DML grants remain absent on all application tables", sql(
        "select not exists(select 1 from pg_tables t cross join "
        "(values('anon'),('authenticated')) r(role) cross join "
        "(values('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege) "
        "where schemaname='public' and has_table_privilege(r.role,'public.'||t.tablename,p.privilege));") == "t")
    check("new install has no customer or service data", sql(
        "select (select count(*) from public.tawod_maintenance_customers)=0 "
        "and (select count(*) from public.tawod_maintenance_services)=0;") == "t")
    check("new install has no enabled sync keys or location binding", sql(
        "select not exists(select 1 from public.tawod_sync_keys where enabled) "
        "and not exists(select 1 from public.tawod_business_profile_connection);") == "t")

    subprocess.run([*COMPOSE, "up", "-d", "rest"], check=True)
    # Readiness does not depend on application grants or grant an extra privilege.
    ready("rest", "")
    users = []
    for index in range(2):
        email, password = f"tawod-acceptance-{index}@example.invalid", secrets.token_urlsafe(24)
        signup = request("auth", "signup", "POST", {"email": email, "password": password,
            "data": {"role": "admin", "is_admin": True, "full_name": f"Isolated member {index}"}})
        user = signup.get("user", signup)
        check(f"isolated Auth signup {index}", bool(user.get("email_confirmed_at")))
        session = request("auth", "token?grant_type=password", "POST", {"email": email, "password": password})
        refreshed = request("auth", "token?grant_type=refresh_token", "POST", {"refresh_token": session["refresh_token"]})
        identity = request("auth", "user", token=refreshed["access_token"])
        check(f"login refreshed JWT and identity {index}", identity["id"] == user["id"])
        users.append({"id": identity["id"], "token": refreshed["access_token"]})
    at, bt = [user["token"] for user in users]
    check("separate Auth identities", users[0]["id"] != users[1]["id"])
    service = local_service_jwt()
    rep = {"Prefer": "return=representation"}

    # A and B are ordinary authenticated users; neither may access this service-only workspace.
    tables = sql("select tablename from pg_tables where schemaname='public' order by tablename;").splitlines()
    for label, token in [("visitor", None), ("member A", at), ("member B", bt)]:
        for table in tables:
            denied(f"{label}: private table {table}", table + "?select=*&limit=1", token)
        for name, payload in [
            ("tawod_admin_analytics", {"p_days": 30}),
            ("tawod_google_ads_analytics", {"p_days": 30}),
            ("tawod_business_profile_analytics", {"p_days": 30}),
            ("tawod_business_profile_ingest", {"p_location_id": "locations/111", "p_daily": [], "p_keywords": []}),
            *[("tawod_maintenance_" + name, {"p_action": "save_request", "p_payload": {}, "p_actor": "admin"})
              for name in ["overview", "listing", "detail", "contacts", "catalog", "save", "archive", "workspace"]],
        ]:
            denied(f"{label}: private RPC {name}", "rpc/" + name, token, "POST", payload)

    events = [
        {"event_name": name, "visitor_id": "synthetic-visitor", "session_id": "synthetic-session", "page_path": "/"}
        for name in ["page_view", "call_click", "whatsapp_click"]
    ]
    request("rest", "tawod_analytics_events", "POST", events, service, (201,))
    check("server analytics INSERT and SELECT", len(request("rest", "tawod_analytics_events", token=service)) == 3)
    denied("server analytics DELETE forbidden", "tawod_analytics_events?event_name=eq.page_view", service, "DELETE")
    denied("server analytics UPDATE forbidden", "tawod_analytics_events?event_name=eq.page_view", service, "PATCH", {"page_path": "/changed"})
    analytics = rpc("tawod_admin_analytics", {"p_days": 30}, service)
    check("analytics report compiles on PostgreSQL 17 and counts call/WhatsApp clicks",
          analytics["summary"]["calls"] == 1 and analytics["summary"]["whatsapp"] == 1)
    check("Google Ads report callable by server", isinstance(rpc("tawod_google_ads_analytics", {"p_days": 30}, service), dict))

    # Synthetic local catalog only: never production rows, mappings, or credentials.
    request("rest", "tawod_maintenance_services", "POST", {
        "id": "isolated-service", "name": "Isolated service", "group_name": "Test group",
        "description": "Disposable acceptance data", "image_path": "/maintenance/assets/images/test.webp"
    }, service, (201,))
    customer = workspace("save_customer", {"name": "Isolated customer", "phone": "+966500000001"}, token=service)["record"]
    staff = workspace("save_staff", {"name": "Isolated staff", "specialty": "Test"}, token=service)["record"]
    check("server saves customer and staff via routed RPC", bool(customer["id"]) and bool(staff["id"]))
    payload = {"customer_id": customer["id"], "contact_name": "Isolated customer",
        "services": ["isolated-service"], "property_type": "Office", "district": "Test district",
        "request_type": "contract", "status": "inspection", "priority": "normal",
        "source": "manual", "assignee_id": staff["id"], "notes": "Private synthetic request"}
    record = workspace("save_request", payload, token=service)["record"]
    check("request save returns generated reference and service snapshot",
          record["reference"].startswith("TM-") and record["service_snapshot"][0]["id"] == "isolated-service")
    check("request detail joins customer staff and audit history",
          workspace("detail", {"id": record["id"]}, token=service)["record"]["customer_phone"] == customer["phone"]
          and len(workspace("detail", {"id": record["id"]}, token=service)["history"]) == 1)
    check("request listing and overview", workspace("list", {"entity": "requests"}, token=service)["total"] == 1
          and workspace("overview", token=service)["summary"]["total"] == 1)
    updated = workspace("save_request", {**payload, "id": record["id"], "version": record["version"], "status": "completed"}, token=service)["record"]
    check("request update increments version and completion timestamp",
          updated["version"] == record["version"] + 1 and bool(updated["completed_at"]))
    application_error("stale request update rejected",
        lambda: workspace("save_request", {**payload, "id": record["id"], "version": record["version"]}, token=service, expected=(400,)),
        "P0001", "stale_record")
    before = request("rest", "tawod_maintenance_activity", token=service)
    application_error("invalid service rejected",
        lambda: workspace("save_request", {**payload, "services": ["missing-service"]}, token=service, expected=(400,)),
        "P0001", "invalid_service")
    # Trigger a constraint after the INSERT to prove statement atomicity, including activity.
    constraint_error = workspace("save_request", {**payload, "status": "invalid-status"}, token=service, expected=(400,))
    check("invalid status constraint rolls back request creation", constraint_error["code"] == "23514"
          and len(request("rest", "tawod_maintenance_requests", token=service)) == 1
          and request("rest", "tawod_maintenance_activity", token=service) == before)
    application_error("website actor cannot invoke admin save",
        lambda: workspace("save_request", payload, actor="website", token=service, expected=(400,)),
        "P0001", "unauthorized")
    archived = workspace("archive", {"entity": "requests", "id": updated["id"], "version": updated["version"]}, token=service)["record"]
    check("archive hides request from active list", bool(archived["archived_at"])
          and workspace("list", {"entity": "requests"}, token=service)["total"] == 0)
    restored = workspace("restore", {"entity": "requests", "id": archived["id"], "version": archived["version"]}, token=service)["record"]
    check("restore returns active request", restored["archived_at"] is None
          and workspace("list", {"entity": "requests"}, token=service)["total"] == 1)
    for label, token in [("visitor", None), ("member A", at), ("member B", bt)]:
        denied(label + " cannot read known request UUID", "tawod_maintenance_requests?id=eq." + record["id"], token)
        denied(label + " cannot write request", "tawod_maintenance_requests", token, "POST", {})
        denied(label + " cannot mutate known customer", "tawod_maintenance_customers?id=eq." + customer["id"], token, "PATCH", {"name": "Forged"})
        denied(label + " cannot delete known request", "tawod_maintenance_requests?id=eq." + record["id"], token, "DELETE")
        denied(label + " cannot spoof admin actor in workspace", "rpc/tawod_maintenance_workspace", token, "POST",
               {"p_action": "save_request", "p_payload": payload, "p_actor": "admin"})
    for table in ["tawod_maintenance_customers", "tawod_maintenance_staff", "tawod_maintenance_services",
                  "tawod_maintenance_requests", "tawod_maintenance_activity"]:
        denied("server DELETE denied " + table, table, service, "DELETE")
    request("rest", "tawod_maintenance_rate_limits", "POST",
            {"key_hash": "isolated-rate", "bucket": "2020-01-01T00:00:00Z"}, service, (201,))
    request("rest", "tawod_maintenance_rate_limits?key_hash=eq.isolated-rate", "DELETE", token=service, expected=(204,))
    check("server can clean rate limit rows", request("rest", "tawod_maintenance_rate_limits", token=service) == [])

    # Test the actual current GBP SQL contract through HTTP; never call Google or Make.
    request("rest", "tawod_business_profile_connection", "POST", {"slot": "primary", "location_id": "locations/111"}, service, (201,))
    today = sql("select (now() at time zone 'Asia/Riyadh')::date::text;")
    from datetime import date, timedelta
    yesterday = (date.fromisoformat(today) - timedelta(days=1)).isoformat()
    month = yesterday[:7] + "-01"
    fields = ["search_desktop_impressions", "search_mobile_impressions", "maps_desktop_impressions",
              "maps_mobile_impressions", "call_clicks", "website_clicks", "direction_requests", "bookings"]
    cached_at = "2020-01-02T03:04:05.123456Z"
    daily = {"report_date": yesterday, "location_id": "locations/111",
             "profile_name": "شركة تعاود للمقاولات · الرياض", "synced_at": cached_at,
             **{field: index + 1 for index, field in enumerate(fields)}}
    keywords = [{"report_month": month, "location_id": "locations/111", "search_keyword": name,
                 "impressions": impressions, "threshold": threshold, "synced_at": cached_at}
                for name, impressions, threshold in [("exact", 23, None), ("zero", 0, None), ("bound", None, 15)]]

    def ingest(d=None, k=None, location="locations/111", expected=(200,)):
        return rpc("tawod_business_profile_ingest", {
            "p_location_id": location, "p_daily": [daily] if d is None else d,
            "p_keywords": keywords if k is None else k}, service, expected)

    # A different branch's data must survive the configured primary's ingestion.
    request("rest", "tawod_business_profile_daily", "POST",
        {"report_date": yesterday, "location_id": "locations/222", "call_clicks": 999}, service, (201,))
    receipt = ingest()
    check("GBP atomic ingestion with microsecond fetch time", receipt["verified"] is True
          and receipt["dailyWritten"] == 1 and receipt["keywordsWritten"] == 3
          and receipt["sourceFetchedAt"] == cached_at)
    for days in [7, 30, 90]:
        report = rpc("tawod_business_profile_analytics", {"p_days": days}, service)
        check(f"GBP {days}-day report totals and location isolation", report["summary"]["calls"] == 5
              and report["reportingDays"] == 1 and report["locationId"] == "locations/111")
    report = rpc("tawod_business_profile_analytics", {"p_days": 30}, service)
    by_keyword = {row["keyword"]: row for row in report["keywords"]}
    check("GBP exact zero and unknown threshold remain distinct",
          by_keyword["exact"]["impressions"] == 23 and by_keyword["zero"]["impressions"] == 0
          and by_keyword["bound"]["impressions"] is None and by_keyword["bound"]["threshold"] == 15)
    check("GBP replay is idempotent", ingest()["dailyWritten"] == 1
          and len(request("rest", "tawod_business_profile_daily?location_id=eq.locations%2F111", token=service)) == 1)
    older = ingest([{**daily, "call_clicks": 9000, "synced_at": "2018-01-01T00:00:00Z"}], [])
    check("GBP older cache cannot overwrite observations", older["dailySkippedOlder"] == 1)
    for name, d, k, location, code in [
        ("wrong location", [daily], [], "locations/222", "22023"),
        ("today excluded", [{**daily, "report_date": today}], [], "locations/111", "22023"),
        ("negative count", [{**daily, "call_clicks": -1}], [], "locations/111", "22023"),
        ("duplicate daily", [daily, daily], [], "locations/111", "22023"),
        ("ambiguous monthly count", [{**daily, "call_clicks": 77, "synced_at": "2022-01-01T00:00:00Z"}],
            [{**keywords[0], "threshold": 15}], "locations/111", "22023"),
    ]:
        result = ingest(d, k, location, (400,))
        check("GBP rejects " + name, result["code"] == code)
    stored = request("rest", "tawod_business_profile_daily?location_id=eq.locations%2F111", token=service)[0]
    other = request("rest", "tawod_business_profile_daily?location_id=eq.locations%2F222", token=service)[0]
    check("invalid GBP batches roll back and other branch is unchanged", stored["call_clicks"] == 5 and other["call_clicks"] == 999)
    # Force a post-write validation failure, then restore the exact SQL definition.
    definition = sql("select pg_get_functiondef('public.tawod_business_profile_analytics(integer)'::regprocedure);")
    sql("alter function public.tawod_business_profile_analytics(integer) rename to tawod_business_profile_analytics_valid;"
        "create function public.tawod_business_profile_analytics(p_days integer) returns jsonb language sql stable set search_path='' as "
        "$$ select jsonb_set(public.tawod_business_profile_analytics_valid(p_days),'{summary,calls}','999999999'::jsonb) $$;"
        "revoke all on function public.tawod_business_profile_analytics(integer) from public,anon,authenticated;"
        "grant execute on function public.tawod_business_profile_analytics(integer) to service_role;")
    failed = ingest([{**daily, "call_clicks": 77, "synced_at": "2022-01-01T00:00:00Z"}], [], expected=(400,))
    check("GBP post-write reconciliation failure rolls back transaction", failed["code"] == "P0001"
          and "profile_analytics_mismatch" in failed["message"]
          and request("rest", "tawod_business_profile_daily?location_id=eq.locations%2F111", token=service)[0]["call_clicks"] == 5)
    sql("drop function public.tawod_business_profile_analytics(integer);"
        "alter function public.tawod_business_profile_analytics_valid(integer) rename to tawod_business_profile_analytics;"
        + definition + ";notify pgrst, 'reload schema';")
    check("browser authorization metadata did not grant server access", sql(
        "select not has_table_privilege('authenticated','public.tawod_admin_config','SELECT');") == "t")
    invalid = request("rest", "tawod_analytics_events", token="invalid-jwt", expected=(401,))
    check("invalid JWT rejected", invalid["code"].startswith("PGRST"))

    # Do not silently label a full workspace rebuild complete if its dispatcher targets a missing RPC.
    submit_exists = sql("select to_regprocedure('public.tawod_maintenance_submit(text,jsonb,text)') is not null;") == "t"
    summary = {"postgres": "17.6", "migrations": len(files), "rls_tables": 22,
        "passed": len(RESULTS), "cases": RESULTS, "missing_maintenance_submit": not submit_exists,
        "environment": "disposable local services; no managed resources",
        "limits": ["No hosted Supabase gateway/Storage/Edge deployment", "No Google API/Make external sync",
                   "cron/network are no-op local scaffolding; Storage schema only"]}
    print(json.dumps(summary), flush=True)
    check("maintenance workspace submit target exists", submit_exists)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stderr, flush=True)
        raise

