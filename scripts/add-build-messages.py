#!/usr/bin/env python3
"""
Merges the new screen copy into messages/{ar,en}.json.

Merging rather than rewriting: the two message files are hand-authored and
17KB/13KB respectively, and regenerating them would silently drop keys a page
still uses. This only ADDS the namespaces the new screens need, and fails loudly
if a key it expects to add already exists with a different value.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MESSAGES = ROOT / "messages"

ADD = {
    "ar": {
        "appShell": {
            "navigation": "التنقل الرئيسي",
            "bottomNavigation": "التنقل السفلي",
            "signOut": "تسجيل الخروج",
            "signedInAs": "مسجّل الدخول باسم",
            "openMenu": "فتح القائمة",
            "closeMenu": "إغلاق القائمة",
        },
        "common": {
            "loading": "جارٍ التحميل…",
            "retry": "إعادة المحاولة",
            "cancel": "إلغاء",
            "save": "حفظ",
            "close": "إغلاق",
            "back": "رجوع",
            "search": "بحث",
            "print": "طباعة",
            "copy": "نسخ",
            "copied": "تم النسخ",
            "somethingWentWrong": "تعذّر إكمال العملية. حاول مرة أخرى.",
            "notFoundTitle": "الصفحة غير موجودة",
            "notFoundBody": "الرابط الذي فتحته غير صحيح أو لم يعد متاحًا.",
        },
        "dashboard": {
            "title": "لوحة المعلم",
            "greeting": "أهلًا بك",
            "today": "اليوم",
            "recentPlans": "أحدث الخطط",
            "stagedFeedback": "ملاحظات بانتظار مراجعتك",
            "stagedFeedbackCount": "{count, plural, =0 {لا شيء بانتظار المراجعة} one {ملاحظة واحدة} two {ملاحظتان} few {# ملاحظات} many {# ملاحظة} other {# ملاحظة}}",
            "quickActions": "إجراءات سريعة",
            "newPlan": "خطة جديدة",
            "browseMethods": "استعرض الطرائق",
            "reviewFeedback": "راجع الملاحظات",
            "emptyTitle": "لا يوجد شيء بعد",
            "emptyBody": "ابدأ بخطة درس، وستظهر هنا.",
        },
        "plans": {
            "title": "خطط الدروس",
            "intro": "خططك محفوظة بالإصدارات: كل تعديل نسخة جديدة، ويمكنك الرجوع إلى أي نسخة سابقة.",
            "new": "خطة جديدة",
            "empty": "لا توجد خطط بعد",
            "emptyHint": "أنشئ خطة من صفحة الأدوات أو من لوحة المعلم.",
            "searchPlaceholder": "ابحث في الخطط",
            "filterStatus": "الحالة",
            "statusAll": "الكل",
            "statusDraft": "مسودة",
            "statusReady": "جاهزة",
            "statusArchived": "مؤرشفة",
            "columns": {
                "title": "العنوان",
                "grade": "الصف",
                "subject": "المادة",
                "version": "الإصدار",
                "updated": "آخر تعديل",
            },
            "detail": {
                "versionLabel": "الإصدار {n}",
                "current": "الحالي",
                "versions": "الإصدارات",
                "history": "سجل التعديلات",
                "historyHint": "الإصدارات للقراءة فقط. لتصحيح نص، أنشئ إصدارًا جديدًا.",
                "restore": "اجعلها الحالية",
                "restoreHint": "ينشئ إصدارًا جديدًا بنص هذه النسخة. لا يُحذف أي إصدار.",
                "duplicate": "نسخ الخطة",
                "archive": "أرشفة",
                "unarchive": "إلغاء الأرشفة",
                "meta": "بيانات الخطة",
                "methodology": "الطريقة",
                "noMethodology": "بدون طريقة محددة",
                "stages": "مراحل الدرس",
                "objectives": "الأهداف",
                "materials": "المواد",
                "assessment": "التقويم",
                "homework": "الواجب",
                "minutes": "{n} دقيقة",
                "emptyVersion": "هذه النسخة لا تحتوي نصًا بعد.",
            },
            "adjust": {
                "title": "تعديل النتيجة",
                "intro": "عدّل ما ولّدته دون إعادة كتابة الطلب. كل تعديل يُنشئ إصدارًا جديدًا.",
                "kind": "نوع التعديل",
                "kinds": {
                    "reading_level": "مستوى القراءة",
                    "length": "الطول",
                    "tone": "النبرة",
                    "language": "اللغة",
                    "regenerate_section": "إعادة توليد قسم",
                },
                "value": "القيمة",
                "section": "القسم",
                "instruction": "ملاحظة إضافية (اختياري)",
                "instructionHint": "لا تكتب اسم أي طالب هنا.",
                "apply": "طبّق التعديل",
                "applying": "جارٍ التعديل…",
                "conflict": "تغيّرت الخطة على جهاز آخر. حدّث الصفحة لتظهر أحدث إصدار قبل التعديل.",
                "publishedLocked": "لا يمكن تعديل ملاحظة نُشرت لطالب.",
                "values": {
                    "grade_5": "الصف الخامس",
                    "grade_6": "الصف السادس",
                    "grade_7": "الصف السابع",
                    "grade_8": "الصف الثامن",
                    "grade_9": "الصف التاسع",
                    "shorter": "أقصر",
                    "longer": "أطول",
                    "formal": "رسمية",
                    "simpler": "أبسط",
                    "ar": "العربية",
                    "en": "الإنجليزية",
                },
            },
        },
        "methods": {
            "title": "طرائق التدريس",
            "intro": "اختر طريقة، أو دع المولّد يقترح واحدة. كل طريقة مكتوبة للصف البحريني، لا مترجمة.",
            "featured": "طريقة هذا الأسبوع",
            "browse": "استعرض {count} طريقة",
            "filters": {
                "group": "التجميع",
                "duration": "المدة",
                "all": "الكل",
                "wholeClass": "الصف كامل",
                "smallGroups": "مجموعات صغيرة",
                "pairsIndividual": "ثنائي / فردي",
                "under15": "أقل من ١٥ دقيقة",
                "15to30": "١٥–٣٠ دقيقة",
                "over30": "أكثر من ٣٠ دقيقة",
                "classSize": "عدد الطلاب",
            },
            "card": {
                "duration": "{n} دقيقة",
                "groupSize": "{min}–{max} طالبًا",
                "use": "استخدمها",
            },
            "helper": {
                "title": "أي طريقة أستخدم غدًا؟",
                "intro": "اختر الحالة الأقرب إلى صفك، ونقترح لك طريقة.",
                "close": "إخفاء",
            },
            "situations": {
                "everyoneSpeaks": "أريد أن يشارك كل طالب، لا المتحدثون فقط.",
                "denseContent": "يجب أن أغطي محتوى كثيفًا في حصة واحدة.",
                "examineEvidence": "أريد أن يفحص الطلاب أدلة، لا أن يقرؤوا عنها فقط.",
            },
            "reasons": {
                "everyoneSpeaks": "كل طالب يكتب قبل أن يتحدث، فتتساوى المشاركة.",
                "denseContent": "يُقسَّم الموضوع إلى أجزاء، فيتعلّم كل طالب جزءًا ويعلّمه للبقية.",
                "examineEvidence": "يفحص الطلاب مصادر أولية ويعيدون بناء المعنى بأنفسهم.",
            },
            "empty": "لا توجد طرائق مطابقة لهذه المرشّحات.",
            "emptyHint": "جرّب إزالة مرشّح أو اثنين.",
        },
        "feedback": {
            "title": "الملاحظات",
            "intro": "لا تصل أي ملاحظة إلى الطالب قبل أن تراجعها وتعتمدها بنفسك.",
            "queue": "بانتظار المراجعة",
            "published": "منشورة",
            "empty": "لا شيء بانتظار المراجعة",
            "emptyHint": "عند توليد ملاحظة، تظهر هنا كمسودة حتى تعتمدها.",
            "student": "الطالب",
            "style": "النمط",
            "styles": {
                "targeted": "ملاحظة موجّهة",
                "glow_grow": "نقاط القوة والتطوير",
                "rubric_criteria": "حسب معايير التقييم",
                "next_steps": "الخطوات التالية",
            },
            "sections": {
                "glows": "نقاط القوة",
                "grows": "نقاط للتطوير",
                "wonderings": "تساؤلات",
                "nextSteps": "الخطوات التالية",
                "body": "الملاحظة",
            },
            "gate": {
                "stagedNotice": "مسودة — لا يراها الطالب.",
                "approve": "اعتماد",
                "approved": "معتمدة",
                "publish": "إرسال إلى الطالب",
                "discard": "تجاهل",
                "approvedBy": "اعتمدها {name}",
                "publishedOn": "أُرسلت في {date}",
                "confirmPublish": "إرسال هذه الملاحظة إلى الطالب؟ لا يمكن التراجع بعدها.",
                "confirmDiscard": "تجاهل هذه الملاحظة؟ لن تُرسل إلى الطالب.",
                "invalidTransition": "لا يمكن تنفيذ هذا الانتقال من الحالة الحالية.",
            },
            "emptyPayload": "لا توجد ملاحظة بعد.",
        },
        "agents": {
            "title": "الوكلاء",
            "intro": "كل مهمة ينفّذها وكيل متخصص ضمن قواعد المنهج، وبإشراف المعلم.",
            "requiresReview": "نتاج هذا الوكيل مسودة حتى تعتمدها",
            "noReview": "نتاج هذا الوكيل جاهز مباشرة",
            "disabled": "معطّل",
            "promptVersion": "إصدار التعليمات",
        },
        "sync": {
            "offline": "أنت غير متصل. تعرض نسخة محفوظة من خططك.",
            "offlineHint": "لا تُحفظ درجات الطلاب على الجهاز.",
            "lastSynced": "آخر مزامنة: {when}",
            "never": "لم تتم المزامنة بعد",
        },
    },
    "en": {
        "appShell": {
            "navigation": "Main navigation",
            "bottomNavigation": "Bottom navigation",
            "signOut": "Sign out",
            "signedInAs": "Signed in as",
            "openMenu": "Open menu",
            "closeMenu": "Close menu",
        },
        "common": {
            "loading": "Loading…",
            "retry": "Try again",
            "cancel": "Cancel",
            "save": "Save",
            "close": "Close",
            "back": "Back",
            "search": "Search",
            "print": "Print",
            "copy": "Copy",
            "copied": "Copied",
            "somethingWentWrong": "That did not work. Please try again.",
            "notFoundTitle": "Page not found",
            "notFoundBody": "That link is wrong or is no longer available.",
        },
        "dashboard": {
            "title": "Teacher dashboard",
            "greeting": "Welcome",
            "today": "Today",
            "recentPlans": "Recent plans",
            "stagedFeedback": "Feedback waiting for you",
            "stagedFeedbackCount": "{count, plural, =0 {Nothing waiting} one {1 note to review} other {# notes to review}}",
            "quickActions": "Quick actions",
            "newPlan": "New plan",
            "browseMethods": "Browse methods",
            "reviewFeedback": "Review feedback",
            "emptyTitle": "Nothing here yet",
            "emptyBody": "Start with a lesson plan and it will appear here.",
        },
        "plans": {
            "title": "Lesson plans",
            "intro": "Your plans are versioned: every change is a new version, and you can go back to any earlier one.",
            "new": "New plan",
            "empty": "No lesson plans yet",
            "emptyHint": "Create one from the tools page or from the dashboard.",
            "searchPlaceholder": "Search plans",
            "filterStatus": "Status",
            "statusAll": "All",
            "statusDraft": "Draft",
            "statusReady": "Ready",
            "statusArchived": "Archived",
            "columns": {
                "title": "Title",
                "grade": "Grade",
                "subject": "Subject",
                "version": "Version",
                "updated": "Last changed",
            },
            "detail": {
                "versionLabel": "Version {n}",
                "current": "Current",
                "versions": "Versions",
                "history": "Change history",
                "historyHint": "Versions are read-only. To correct the text, create a new version.",
                "restore": "Make current",
                "restoreHint": "Creates a new version with this text. Nothing is ever deleted.",
                "duplicate": "Duplicate",
                "archive": "Archive",
                "unarchive": "Unarchive",
                "meta": "Plan details",
                "methodology": "Method",
                "noMethodology": "No method chosen",
                "stages": "Lesson stages",
                "objectives": "Objectives",
                "materials": "Materials",
                "assessment": "Assessment",
                "homework": "Homework",
                "minutes": "{n} min",
                "emptyVersion": "This version has no text yet.",
            },
            "adjust": {
                "title": "Adjust the result",
                "intro": "Change what was generated without rewriting the request. Every adjustment creates a new version.",
                "kind": "What to change",
                "kinds": {
                    "reading_level": "Reading level",
                    "length": "Length",
                    "tone": "Tone",
                    "language": "Language",
                    "regenerate_section": "Regenerate a section",
                },
                "value": "To",
                "section": "Section",
                "instruction": "Anything else (optional)",
                "instructionHint": "Do not write a student's name here.",
                "apply": "Apply",
                "applying": "Applying…",
                "conflict": "This plan changed on another device. Reload to see the newest version before adjusting it.",
                "publishedLocked": "Feedback that has already been sent to a student cannot be changed.",
                "values": {
                    "grade_5": "Grade 5",
                    "grade_6": "Grade 6",
                    "grade_7": "Grade 7",
                    "grade_8": "Grade 8",
                    "grade_9": "Grade 9",
                    "shorter": "Shorter",
                    "longer": "Longer",
                    "formal": "Formal",
                    "simpler": "Simpler",
                    "ar": "Arabic",
                    "en": "English",
                },
            },
        },
        "methods": {
            "title": "Teaching methods",
            "intro": "Pick a method, or let the generator suggest one. Every method is written for the Bahraini classroom, not translated into it.",
            "featured": "Method of the week",
            "browse": "Browse {count} methods",
            "filters": {
                "group": "Grouping",
                "duration": "Duration",
                "all": "All",
                "wholeClass": "Whole class",
                "smallGroups": "Small groups",
                "pairsIndividual": "Pairs / individual",
                "under15": "Under 15 min",
                "15to30": "15–30 min",
                "over30": "Over 30 min",
                "classSize": "Class size",
            },
            "card": {
                "duration": "{n} min",
                "groupSize": "{min}–{max} students",
                "use": "Use it",
            },
            "helper": {
                "title": "Which one should I run tomorrow?",
                "intro": "Pick the situation closest to your class and we will suggest a method.",
                "close": "Hide",
            },
            "situations": {
                "everyoneSpeaks": "I want every student to say something, not just the talkative ones.",
                "denseContent": "I need to cover dense content in one period.",
                "examineEvidence": "I want students to examine evidence, not just read about it.",
            },
            "reasons": {
                "everyoneSpeaks": "Every student writes before anyone speaks, which equalises participation.",
                "denseContent": "The topic is split into parts, so each student learns one and teaches the rest.",
                "examineEvidence": "Students work with primary sources and reconstruct the meaning themselves.",
            },
            "empty": "No methods match those filters.",
            "emptyHint": "Try removing one or two filters.",
        },
        "feedback": {
            "title": "Feedback",
            "intro": "Nothing reaches a student until you have reviewed it and approved it yourself.",
            "queue": "Waiting for review",
            "published": "Published",
            "empty": "Nothing to review",
            "emptyHint": "Generated feedback appears here as a draft until you approve it.",
            "student": "Student",
            "style": "Style",
            "styles": {
                "targeted": "Targeted feedback",
                "glow_grow": "Glow & grow",
                "rubric_criteria": "Rubric criteria",
                "next_steps": "Next steps",
            },
            "sections": {
                "glows": "Strengths",
                "grows": "Areas to grow",
                "wonderings": "Wonderings",
                "nextSteps": "Next steps",
                "body": "Feedback",
            },
            "gate": {
                "stagedNotice": "Draft — the student cannot see this.",
                "approve": "Approve",
                "approved": "Approved",
                "publish": "Send to student",
                "discard": "Discard",
                "approvedBy": "Approved by {name}",
                "publishedOn": "Sent {date}",
                "confirmPublish": "Send this feedback to the student? This cannot be undone.",
                "confirmDiscard": "Discard this feedback? It will not be sent.",
                "invalidTransition": "That change is not allowed from the current state.",
            },
            "emptyPayload": "No feedback yet.",
        },
        "agents": {
            "title": "Agents",
            "intro": "Each task is run by a specialised agent inside curriculum rules, with the teacher in charge.",
            "requiresReview": "Output from this agent is a draft until you approve it",
            "noReview": "Output from this agent is ready as-is",
            "disabled": "Disabled",
            "promptVersion": "Prompt version",
        },
        "sync": {
            "offline": "You are offline. Showing a saved copy of your plans.",
            "offlineHint": "Student marks are never stored on this device.",
            "lastSynced": "Last synced {when}",
            "never": "Not synced yet",
        },
    },
}

for locale, additions in ADD.items():
    path = MESSAGES / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))

    conflicts = []
    added = 0
    for ns, keys in additions.items():
        bucket = data.setdefault(ns, {})
        for key, value in keys.items():
            if key in bucket and bucket[key] != value and not isinstance(value, dict):
                conflicts.append(f"{locale}.{ns}.{key} already exists with a different value")
                continue
            if isinstance(value, dict):
                nested = bucket.setdefault(key, {})
                for nk, nv in value.items():
                    if nk in nested and nested[nk] != nv:
                        conflicts.append(f"{locale}.{ns}.{key}.{nk} already exists with a different value")
                        continue
                    if nk not in nested:
                        added += 1
                    nested[nk] = nv
            else:
                if key not in bucket:
                    added += 1
                bucket[key] = value

    if conflicts:
        print(f"{locale}: {len(conflicts)} conflict(s):")
        for c in conflicts:
            print("  -", c)
        sys.exit(1)

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{locale}.json: +{added} keys, {len(data)} top-level namespaces")
