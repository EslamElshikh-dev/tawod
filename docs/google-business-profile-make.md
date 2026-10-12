# ربط ملف تعاود التجاري عبر Make

مدخل اللوحة يستقبل استجابة Google Business Profile Performance API مباشرة. تحويل الصفوف والتحقق منها والحفظ وفحص إجماليات ٧ و٣٠ و٩٠ يومًا تتم داخل Supabase، لتقليل عمليات Make وتجنب تكرار عملية حفظ لكل يوم.

## نطاق الربط وحالته

- اللوحة تستقبل الحساب المحدد سرًا في `tawod_business_profile_connection`، الخانة `primary`، وهو تعاود بالرياض. أي حساب آخر يُرفض داخل قاعدة البيانات.
- تُحفظ بيانات ملف المستخدم وسما سكان وفرع الدمام في مسارات مستقلة عند تجهيز لوحاتها؛ لا تمررها إلى هذا المدخل.
- تجهيز الكود لا يعني اكتمال اتصال Google أو إنشاء السيناريو. يلزم اتصال Make صالح وصلاحية Performance API، ثم قراءة حقيقية واختبار قبل تفعيل الجدولة.
- تظل مزامنة Windsor السابقة متوقفة إلى أن ينجح المصدر البديل. لا تشغّل مصدرين بجدولتين متعارضتين.

## الاتصال

تحتاج Google OAuth مع النطاق `https://www.googleapis.com/auth/business.manage` وحساب يدير الملف. استخدم اتصال Google المناسب إن كان يدعم عنوان Performance API الكامل؛ وإلا استخدم HTTP مع OAuth 2.0. اكتشف الوحدات وحقولها الفعلية في Make قبل إنشاء السيناريو، دون تخمين أسماء الوحدات أو معرفات الاتصالات.

إذا استخدمت مشروع Google Cloud خاصًا، تحقق من موافقة الوصول وتفعيل Business Profile Performance API والحصة المتاحة. Make لا يتجاوز موافقة Google. نطاقات وصلاحيات الاتصال ومتطلبات OAuth تُضبط في اتصال Make، وتبقى الرموز داخله.

طلب الحفظ:

```text
POST https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics
Content-Type: application/json
x-tawod-sync-key: [مفتاح business_profile في اتصال API Key سري داخل Make]
```

لا تستخدم مفتاح Supabase `service_role` داخل Make. المدخل يتحقق من مفتاح المزامنة المخصص؛ الصلاحيات الداخلية واسم ملف الرياض محفوظة على الخادم. لا تضف المفتاح إلى المستودع أو مخرجات المزامنة. يدعم المدخل أيضًا `syncKey` في الجسم للعميل القديم.

## السيناريو اليومي

اسم مقترح: `تعاود الرياض · أداء الملف التجاري`. الجدول المقترح مرة يوميًا الساعة ٨ صباحًا، بتوقيت `Asia/Riyadh`.

1. احسب أمس محليًا، ثم البداية = أمس ناقص ٨٩ يومًا. ثبّت هذا النطاق ووقت بدء طلب Google `syncedAt` بصيغة UTC لكل محاولة، وأعد استخدامهما عند إعادة إرسال الاستجابة نفسها.
2. نفّذ GET واحدًا إلى `https://businessprofileperformance.googleapis.com/v1/{locationId}:fetchMultiDailyMetricsTimeSeries`، مع المقاييس الثمانية التالية و`dailyRange.startDate.year/month/day` و`dailyRange.endDate.year/month/day`.
3. بعد HTTP 2xx فقط، أرسل كائن JSON الناتج كاملًا إلى مدخل اللوحة وفق الجدول. لا تحوّله إلى صفوف داخل Make، ولا تستبدل الحقول المفقودة بـ٠.

| جسم طلب الحفظ | القيمة |
|---|---|
| `mode` | `business_profile_google_sync` |
| `locationId` | معرف الرياض المطابق لطلب Google وإعداد اللوحة |
| `syncedAt` | وقت بدء طلب Google الفعلي، UTC؛ ليس وقت حفظ اللوحة |
| `rangeStart` | بداية النطاق `YYYY-MM-DD` |
| `rangeEnd` | أمس بتوقيت الرياض `YYYY-MM-DD` |
| `dailyResponse` | استجابة Google المحللة ككائن JSON، وليست نص JSON مقتبسًا |

| Google dailyMetric | عمود الحفظ |
|---|---|
| `BUSINESS_IMPRESSIONS_DESKTOP_SEARCH` | `search_desktop_impressions` |
| `BUSINESS_IMPRESSIONS_MOBILE_SEARCH` | `search_mobile_impressions` |
| `BUSINESS_IMPRESSIONS_DESKTOP_MAPS` | `maps_desktop_impressions` |
| `BUSINESS_IMPRESSIONS_MOBILE_MAPS` | `maps_mobile_impressions` |
| `CALL_CLICKS` | `call_clicks` |
| `WEBSITE_CLICKS` | `website_clicks` |
| `BUSINESS_DIRECTION_REQUESTS` | `direction_requests` |
| `BUSINESS_BOOKINGS` | `bookings` |

كرّر معامل `dailyMetrics` لكل مقياس. يتحقق المدخل من وجود المقاييس الثمانية لكل تاريخ موجود، ومن التفرد والقيم الصحيحة غير السالبة والتواريخ داخل النطاق. النقطة المؤرخة التي تحذف Google حقل `value` منها تعني صفرًا حسب توثيق Google؛ غياب النقطة أو السلسلة أو وجود `null` لا يعني صفرًا.

## السيناريو الشهري لكلمات البحث

اسم مقترح: `تعاود الرياض · كلمات البحث الشهرية`. نفّذ ملء الأشهر المتداخلة مع آخر ٩٠ يومًا مرة أولى، ثم تحديثًا أسبوعيًا لهذه الأشهر؛ يمكن تعديل التكرار بعد قياس الاستهلاك الفعلي.

- قد يمتد نطاق ٩٠ يومًا إلى أربعة أشهر. كوّن الأشهر بسنتها من البداية والنهاية، ثم اطلب كل شهر منفردًا؛ طلب عدة أشهر يعيد حصيلة مشتركة لا تصلح كسجل شهري واحد.
- GET `https://businessprofileperformance.googleapis.com/v1/{locationId}/searchkeywords/impressions/monthly` مع `monthlyRange.startMonth.year/month` و`monthlyRange.endMonth.year/month` للشهر نفسه، و`pageSize=100`.
- لكل صفحة ناجحة، أرسل `mode` و`locationId` و`syncedAt` كما سبق، و`reportMonth` = أول الشهر `YYYY-MM-01` و`keywordResponse` = استجابة Google ككائن JSON. لا ترسل `dailyResponse` في هذا المسار.
- مرر `nextPageToken` إلى طلب Google التالي حتى يغيب. أوقف الصفحة المتكررة أو الحلقة غير المحدودة ولا تتجاهل صفحة فاشلة. الصفحات المكتملة محفوظة ويمكن إعادة طلبها بأمان؛ لا تصف الشهر كمكتمل قبل نجاح جميع الصفحات.
- `insightsValue.value` يُحفظ كعدد دقيق، و`insightsValue.threshold` يُحفظ كحد مع `impressions=NULL`. القيمة الدقيقة ٠ تظل ٠. الحد ليس عددًا دقيقًا، ولا يدخل في إجمالي الأعداد الدقيقة.

## التحقق والتشغيل

الحفظ يتم بمعاملة واحدة للدُفعة في `tawod_business_profile_ingest`، بالمفتاح اليومي `(report_date,location_id)` والمفتاح الشهري `(report_month,location_id,search_keyword)`. السجلات ذات وقت جلب أقدم لا تستبدل الأحدث. الدالة خاصة بـ`service_role`، وبيانات الإعلانات والمبيعات والأنشطة العامة خارج هذا المسار.

يعود الرد بـ`ok=true` و`receipt.verified=true` فقط بعد مطابقة جميع الصفوف المحفوظة وفحص إجماليات SQL وتغطية الأيام وكلمات البحث مع `tawod_business_profile_analytics(7/30/90)`. `dailySkippedOlder` و`keywordsSkippedOlder` توضحان تجاهل الكاش القديم. `receivedMonthlyCounts` يخص الصفحة/الدُفعة المستلمة، ولا يمثل حصيلة مقاييس يومية. الصفحات الفارغة الصحيحة تُتحقق من ربط حسابها دون اختلاق سجلات.

نافذة RPC الحالية تشمل اليوم؛ لذلك مصدر ينتهي بأمس يغطّي حتى ٦/٢٩/٨٩ يومًا داخل نوافذ ٧/٣٠/٩٠. افحص `reportingDays` و`lastReportDate` والفجوات؛ لا تملأ الأيام الغائبة بأصفار. آخر الأيام قد تتأخر أو تتغير بعد معالجة Google. نقرة الاتصال لا تثبت مكالمة مستلمة.

جرّب طلب أداء حقيقي وصفحة كلمات حقيقية أولًا. عند 401 راجع المفتاح/اتصال Google، وعند 403 أو quota=0 راجع صلاحية المشروع، وعند 429/5xx أعد المحاولة بعد انتظار مناسب. عند بيانات غير صالحة أو اختلاف الإجماليات أوقف المسار وأظهر الخطأ. التنبيه للمستخدم عند الفشل فقط؛ النجاح تحديث خلفي. لا ترسل رسائل خارجية دون تفويض.

الحد الأدنى للشبكة في المسار اليومي عمليتان لكل ملف/تشغيل: طلب Google ثم حفظ الدُفعة. الاستهلاك الفعلي يشمل وحدات ضبط المتغيرات والتكرار والصفحات والإعادات والتجارب. راجع رصيد Make الفعلي قبل التفعيل؛ لا تَعِد بعدد ثابت من الكريدت دون اختبار السيناريو.

بديل دون Make: السكربت `scripts/google-business-profile-sync.js` مع إعدادات OAuth في `scripts/google-business-profile-appsscript.json`. يحتفظ بالمفاتيح في Script Properties ويطبق النطاق نفسه والتحقق نفسه. يحتاج أيضًا صلاحية Google؛ لا يتجاوزها.

## مراجع رسمية

- [GET الأداء اليومي](https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries)
- [DatedValue ومعنى حذف قيمة الصفر](https://developers.google.com/my-business/reference/performance/rest/v1/TimeSeries)
- [كلمات البحث الشهرية والصفحات](https://developers.google.com/my-business/reference/performance/rest/v1/locations.searchkeywords.impressions.monthly/list)
- [متطلبات الوصول إلى Google Business Profile API](https://developers.google.com/my-business/content/prereqs)
- [Make Google Business Profile](https://apps.make.com/google-my-business)
- [خطط Make وحدودها](https://www.make.com/en/pricing)
