"""Static seed/config list of business types.

Not a database table: `Business.type_id` stores one of the `id` values below as a
plain string, validated against this list. The frontend resolves icon/accent/vocab
display details by looking up the type by id (also exposed via GET /business-types).
"""

BUSINESS_TYPES = [
    {
        "id": "barber",
        "label_mk": "Берберница",
        "label_en": "Barber",
        "icon_key": "scissors",
        "accent_key": "amber",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Машко стрижење",
                "name_en": "Men's haircut",
                "duration_minutes": 30,
                "price": 400,
            },
            {"name_mk": "Бричење", "name_en": "Shave", "duration_minutes": 20, "price": 250},
            {
                "name_mk": "Стрижење + брада",
                "name_en": "Haircut + beard",
                "duration_minutes": 45,
                "price": 600,
            },
        ],
    },
    {
        "id": "hair_salon",
        "label_mk": "Фризерски салон",
        "label_en": "Hair Salon",
        "icon_key": "wand-2",
        "accent_key": "rose",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Женско шишање",
                "name_en": "Women's haircut",
                "duration_minutes": 45,
                "price": 600,
            },
            {
                "name_mk": "Боење коса",
                "name_en": "Hair coloring",
                "duration_minutes": 90,
                "price": 1800,
            },
            {
                "name_mk": "Фен фризура",
                "name_en": "Blow-dry styling",
                "duration_minutes": 30,
                "price": 500,
            },
        ],
    },
    {
        "id": "nail_salon",
        "label_mk": "Маникир салон",
        "label_en": "Nail Salon",
        "icon_key": "hand",
        "accent_key": "fuchsia",
        "vocab_key": "service",
        "default_services": [
            {"name_mk": "Маникир", "name_en": "Manicure", "duration_minutes": 45, "price": 500},
            {"name_mk": "Педикир", "name_en": "Pedicure", "duration_minutes": 60, "price": 700},
            {"name_mk": "Гел нокти", "name_en": "Gel nails", "duration_minutes": 75, "price": 1200},
        ],
    },
    {
        "id": "beauty_salon",
        "label_mk": "Салон за убавина",
        "label_en": "Beauty Salon",
        "icon_key": "sparkles",
        "accent_key": "violet",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Чистење на лице",
                "name_en": "Facial cleansing",
                "duration_minutes": 60,
                "price": 1500,
            },
            {
                "name_mk": "Третман за лице",
                "name_en": "Facial treatment",
                "duration_minutes": 45,
                "price": 1800,
            },
        ],
    },
    {
        "id": "lashes_brows",
        "label_mk": "Трепки и веѓи",
        "label_en": "Lashes & Brows",
        "icon_key": "eye",
        "accent_key": "violet",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Ламинација на веѓи",
                "name_en": "Brow lamination",
                "duration_minutes": 45,
                "price": 900,
            },
            {
                "name_mk": "Поставување трепки",
                "name_en": "Lash extensions",
                "duration_minutes": 90,
                "price": 2000,
            },
        ],
    },
    {
        "id": "makeup_artist",
        "label_mk": "Шминкер",
        "label_en": "Makeup Artist",
        "icon_key": "palette",
        "accent_key": "rose",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Дневна шминка",
                "name_en": "Day makeup",
                "duration_minutes": 45,
                "price": 1200,
            },
            {
                "name_mk": "Вечерна шминка",
                "name_en": "Evening makeup",
                "duration_minutes": 60,
                "price": 2000,
            },
        ],
    },
    {
        "id": "massage",
        "label_mk": "Масажа",
        "label_en": "Massage",
        "icon_key": "hand-heart",
        "accent_key": "teal",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Релакс масажа 30 мин",
                "name_en": "Relax massage 30 min",
                "duration_minutes": 30,
                "price": 1000,
            },
            {
                "name_mk": "Релакс масажа 60 мин",
                "name_en": "Relax massage 60 min",
                "duration_minutes": 60,
                "price": 1800,
            },
        ],
    },
    {
        "id": "spa_wellness",
        "label_mk": "Спа и велнес",
        "label_en": "Spa & Wellness",
        "icon_key": "flower-2",
        "accent_key": "teal",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Спа пакет",
                "name_en": "Spa package",
                "duration_minutes": 90,
                "price": 2500,
            },
        ],
    },
    {
        "id": "waxing",
        "label_mk": "Депилација",
        "label_en": "Waxing",
        "icon_key": "droplet",
        "accent_key": "fuchsia",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Депилација нозе",
                "name_en": "Leg waxing",
                "duration_minutes": 30,
                "price": 700,
            },
            {
                "name_mk": "Депилација подмишници",
                "name_en": "Underarm waxing",
                "duration_minutes": 15,
                "price": 300,
            },
        ],
    },
    {
        "id": "physiotherapy",
        "label_mk": "Физиотерапија",
        "label_en": "Physiotherapy",
        "icon_key": "activity",
        "accent_key": "sky",
        "vocab_key": "medical",
        "default_services": [
            {
                "name_mk": "Физиотерапевтски преглед",
                "name_en": "Physiotherapy exam",
                "duration_minutes": 45,
                "price": 1500,
            },
            {
                "name_mk": "Терапевтска вежба",
                "name_en": "Therapeutic exercise session",
                "duration_minutes": 30,
                "price": 1000,
            },
        ],
    },
    {
        "id": "dental",
        "label_mk": "Стоматологија",
        "label_en": "Dental",
        "icon_key": "smile",
        "accent_key": "sky",
        "vocab_key": "medical",
        "default_services": [
            {
                "name_mk": "Стоматолошки преглед",
                "name_en": "Dental checkup",
                "duration_minutes": 30,
                "price": 1000,
            },
            {
                "name_mk": "Чистење каменец",
                "name_en": "Teeth cleaning",
                "duration_minutes": 45,
                "price": 1800,
            },
        ],
    },
    {
        "id": "medical_clinic",
        "label_mk": "Медицинска клиника",
        "label_en": "Medical Clinic",
        "icon_key": "stethoscope",
        "accent_key": "sky",
        "vocab_key": "medical",
        "default_services": [
            {
                "name_mk": "Општ преглед",
                "name_en": "General checkup",
                "duration_minutes": 30,
                "price": 1500,
            },
            {
                "name_mk": "Контролен преглед",
                "name_en": "Follow-up exam",
                "duration_minutes": 20,
                "price": 800,
            },
        ],
    },
    {
        "id": "aesthetics_derma",
        "label_mk": "Естетика и дерматологија",
        "label_en": "Aesthetics & Dermatology",
        "icon_key": "sparkle",
        "accent_key": "violet",
        "vocab_key": "medical",
        "default_services": [
            {
                "name_mk": "Дерматолошки преглед",
                "name_en": "Dermatology exam",
                "duration_minutes": 30,
                "price": 2000,
            },
            {
                "name_mk": "Третман со ботокс",
                "name_en": "Botox treatment",
                "duration_minutes": 30,
                "price": 8000,
            },
        ],
    },
    {
        "id": "tattoo_piercing",
        "label_mk": "Тетоважа и пирсинг",
        "label_en": "Tattoo & Piercing",
        "icon_key": "pen-tool",
        "accent_key": "slate",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Консултација за тетоважа",
                "name_en": "Tattoo consultation",
                "duration_minutes": 30,
                "price": 0,
            },
            {"name_mk": "Пирсинг", "name_en": "Piercing", "duration_minutes": 20, "price": 800},
        ],
    },
    {
        "id": "therapy_counseling",
        "label_mk": "Терапија и советување",
        "label_en": "Therapy & Counseling",
        "icon_key": "message-circle-heart",
        "accent_key": "emerald",
        "vocab_key": "session",
        "default_services": [
            {
                "name_mk": "Индивидуална сесија",
                "name_en": "Individual session",
                "duration_minutes": 50,
                "price": 1800,
            },
            {
                "name_mk": "Брачно советување",
                "name_en": "Couples counseling",
                "duration_minutes": 60,
                "price": 2200,
            },
        ],
    },
    {
        "id": "personal_trainer",
        "label_mk": "Персонален тренер",
        "label_en": "Personal Trainer",
        "icon_key": "dumbbell",
        "accent_key": "orange",
        "vocab_key": "session",
        "default_services": [
            {
                "name_mk": "Индивидуален тренинг",
                "name_en": "1:1 training session",
                "duration_minutes": 60,
                "price": 1000,
            },
        ],
    },
    {
        "id": "yoga_pilates",
        "label_mk": "Јога и пилатес",
        "label_en": "Yoga & Pilates",
        "icon_key": "person-standing",
        "accent_key": "emerald",
        "vocab_key": "session",
        "default_services": [
            {
                "name_mk": "Јога сесија",
                "name_en": "Yoga session",
                "duration_minutes": 60,
                "price": 600,
            },
            {
                "name_mk": "Пилатес сесија",
                "name_en": "Pilates session",
                "duration_minutes": 50,
                "price": 700,
            },
        ],
    },
    {
        "id": "pet_grooming",
        "label_mk": "Нега на миленичиња",
        "label_en": "Pet Grooming",
        "icon_key": "dog",
        "accent_key": "amber",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Шишање куче (мало)",
                "name_en": "Small dog grooming",
                "duration_minutes": 60,
                "price": 1000,
            },
            {
                "name_mk": "Шишање куче (големо)",
                "name_en": "Large dog grooming",
                "duration_minutes": 90,
                "price": 1500,
            },
        ],
    },
    {
        "id": "car_wash",
        "label_mk": "Автоперална",
        "label_en": "Car Wash",
        "icon_key": "car",
        "accent_key": "sky",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Надворешно миење",
                "name_en": "Exterior wash",
                "duration_minutes": 30,
                "price": 300,
            },
            {
                "name_mk": "Целосно чистење",
                "name_en": "Full detailing",
                "duration_minutes": 120,
                "price": 2500,
            },
        ],
    },
    {
        "id": "photographer",
        "label_mk": "Фотограф",
        "label_en": "Photographer",
        "icon_key": "camera",
        "accent_key": "slate",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Портретна фото сесија",
                "name_en": "Portrait photo session",
                "duration_minutes": 60,
                "price": 3000,
            },
        ],
    },
    {
        "id": "tutoring",
        "label_mk": "Часови и обуки",
        "label_en": "Tutoring",
        "icon_key": "book-open",
        "accent_key": "orange",
        "vocab_key": "service",
        "default_services": [
            {
                "name_mk": "Индивидуален час",
                "name_en": "1:1 lesson",
                "duration_minutes": 60,
                "price": 600,
            },
        ],
    },
    {
        "id": "other",
        "label_mk": "Друго",
        "label_en": "Other",
        "icon_key": "store",
        "accent_key": "slate",
        "vocab_key": "service",
        "default_services": [
            {"name_mk": "Закажување", "name_en": "Appointment", "duration_minutes": 30, "price": 0},
        ],
    },
]

BUSINESS_TYPES_BY_ID = {bt["id"]: bt for bt in BUSINESS_TYPES}
