// Multi-Country Location Dataset with Governorates/Regions & Local Delegations/Communes

export const locationData = [
  {
    code: "SN",
    flag: "🇸🇳",
    names: { fr: "Sénégal", en: "Senegal", ar: "السنغال" },
    regions: [
      {
        id: "dakar",
        names: { fr: "Dakar", en: "Dakar", ar: "داكار" },
        performance: 4.2,
        localities: ["Dakar Plateau", "Médina", "Grand Yoff", "Yoff", "Almadies", "Parcelles Assainies", "Hann Bel-Air", "Ouakam"]
      },
      {
        id: "thies",
        names: { fr: "Thiès", en: "Thies", ar: "ثايس" },
        performance: 3.9,
        localities: ["Thiès Nord", "Thiès Est", "Thiès Ouest", "Mbour", "Tivaouane", "Joal-Fadiouth", "Popenguine"]
      },
      {
        id: "kedougou",
        names: { fr: "Kédougou", en: "Kedougou", ar: "كيدوغو" },
        performance: 3.8,
        localities: ["Kédougou Ville", "Salémata", "Saraya", "Bandafassi", "Fongolimbi"]
      },
      {
        id: "ziguinchor",
        names: { fr: "Ziguinchor", en: "Ziguinchor", ar: "زيغينشور" },
        performance: 3.7,
        localities: ["Ziguinchor Commune", "Bignona", "Oussouye", "Cap Skirring", "Thionck Essyl"]
      },
      {
        id: "saintlouis",
        names: { fr: "Saint-Louis", en: "Saint-Louis", ar: "سان لويس" },
        performance: 3.6,
        localities: ["Ndar Island", "Santhiaba", "Dagana", "Podor", "Richard-Toll", "Mpal"]
      },
      {
        id: "fatick",
        names: { fr: "Fatick", en: "Fatick", ar: "فاتيك" },
        performance: 3.5,
        localities: ["Fatick Commune", "Foundiougne", "Gossas", "Passy", "Sokone"]
      },
      {
        id: "kaolack",
        names: { fr: "Kaolack", en: "Kaolack", ar: "كاولاك" },
        performance: 3.2,
        localities: ["Kaolack Ville", "Guinguinéo", "Ndoffane", "Nioro du Rip"]
      },
      {
        id: "tambacounda",
        names: { fr: "Tambacounda", en: "Tambacounda", ar: "تامباكوندا" },
        performance: 2.8,
        localities: ["Tambacounda Commune", "Bakel", "Goudiry", "Koumpentoum"]
      }
    ]
  },
  {
    code: "TN",
    flag: "🇹🇳",
    names: { fr: "Tunisie", en: "Tunisia", ar: "تونس" },
    regions: [
      { id: "ariana", names: { fr: "Ariana", en: "Ariana", ar: "أريانة" }, performance: 4.1, localities: ["Ariana Ville", "Ettadhamen", "Kalâat el-Andalous", "La Soukra", "Mnihla", "Raoued", "Sidi Thabet"] },
      { id: "beja", names: { fr: "Béja", en: "Beja", ar: "باجة" }, performance: 3.5, localities: ["Amdoun", "Béja Nord", "Béja Sud", "Goubellat", "Medjez el-Bab", "Nefza", "Téboursouk", "Testour", "Thibar"] },
      { id: "benarous", names: { fr: "Ben Arous", en: "Ben Arous", ar: "بن عروس" }, performance: 3.9, localities: ["Ben Arous", "Bou Mhel", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Lif", "Mégrine", "Mornag", "Radès"] },
      { id: "bizerte", names: { fr: "Bizerte", en: "Bizerte", ar: "بنزرت" }, performance: 3.8, localities: ["Bizerte Nord", "Bizerte Sud", "El Alia", "Ghar El Melh", "Mateur", "Menzel Bourguiba", "Ras Jebel", "Sejnane"] },
      { id: "gabes", names: { fr: "Gabès", en: "Gabes", ar: "قابس" }, performance: 3.6, localities: ["Gabès Médina", "Gabès Ouest", "Gabès Sud", "El Hamma", "Mareth", "Matmata", "Métouia"] },
      { id: "gafsa", names: { fr: "Gafsa", en: "Gafsa", ar: "قفصة" }, performance: 3.4, localities: ["El Ksar", "Gafsa Nord", "Gafsa Sud", "Mdhilla", "Métlaoui", "Moularès", "Redeyef", "Sened"] },
      { id: "jendouba", names: { fr: "Jendouba", en: "Jendouba", ar: "جندوبة" }, performance: 3.5, localities: ["Aïn Draham", "Bou Salem", "Fernana", "Ghardimaou", "Jendouba", "Tabarka"] },
      { id: "kairouan", names: { fr: "Kairouan", en: "Kairouan", ar: "القيروان" }, performance: 3.7, localities: ["Bou Hajla", "Chebika", "Haffouz", "Kairouan Nord", "Kairouan Sud", "Nasrallah", "Oueslatia", "Sbikha"] },
      { id: "kasserine", names: { fr: "Kasserine", en: "Kasserine", ar: "القصرين" }, performance: 3.2, localities: ["Fériana", "Foussana", "Haïdra", "Kasserine Nord", "Kasserine Sud", "Sbeitla", "Thala"] },
      { id: "kebili", names: { fr: "Kébili", en: "Kebili", ar: "قبلي" }, performance: 3.3, localities: ["Douz Nord", "Douz Sud", "El Faouar", "Kébili Nord", "Kébili Sud", "Souk Lahad"] },
      { id: "kef", names: { fr: "Le Kef", en: "Le Kef", ar: "الكاف" }, performance: 3.6, localities: ["Dahmani", "Jérissa", "Kalaat Senan", "Le Kef Est", "Le Kef Ouest", "Le Sers", "Tajerouine"] },
      { id: "mahdia", names: { fr: "Mahdia", en: "Mahdia", ar: "المهدية" }, performance: 3.9, localities: ["Bou Merdes", "Chebba", "El Jem", "Ksour Essef", "Mahdia", "Melloulèche", "Souassi"] },
      { id: "manouba", names: { fr: "Manouba", en: "Manouba", ar: "منوبة" }, performance: 3.7, localities: ["Borj El Amri", "Douar Hicher", "Jedaida", "Manouba", "Mornaguia", "Oued Ellil", "Tebourba"] },
      { id: "medenine", names: { fr: "Médenine", en: "Medenine", ar: "مدنين" }, performance: 3.8, localities: ["Ben Gardane", "Beni Khedache", "Djerba Houmt Souk", "Djerba Midoun", "Médenine Nord", "Médenine Sud", "Zarzis"] },
      { id: "monastir", names: { fr: "Monastir", en: "Monastir", ar: "المنستير" }, performance: 4.2, localities: ["Bekalta", "Bembla", "Jammel", "Ksar Hellal", "Moknine", "Monastir", "Sahline", " Sayada", "Téboulba"] },
      { id: "nabeul", names: { fr: "Nabeul", en: "Nabeul", ar: "نابل" }, performance: 4.0, localities: ["Béni Khalled", "Grombalia", "Hammamet", "Kélibia", "Korba", "Menzel Temime", "Nabeul", "Soliman"] },
      { id: "sfax", names: { fr: "Sfax", en: "Sfax", ar: "صفاقس" }, performance: 4.1, localities: ["Agareb", "El Amra", "El Hencha", "Kerkennah", "Mahares", "Sakiet Eddaïer", "Sakiet Ezzit", "Sfax Ouest", "Sfax Sud", "Sfax Ville"] },
      { id: "sidibouzid", names: { fr: "Sidi Bouzid", en: "Sidi Bouzid", ar: "سيدي بوزيد" }, performance: 3.3, localities: ["Jilma", "Meknassy", "Regueb", "Sidi Bouzid Est", "Sidi Bouzid Ouest"] },
      { id: "siliana", names: { fr: "Siliana", en: "Siliana", ar: "سليانة" }, performance: 3.4, localities: ["Bargou", "Bou Arada", "Gaâfour", "Makthar", "Siliana Nord", "Siliana Sud"] },
      { id: "sousse", names: { fr: "Sousse", en: "Sousse", ar: "سوسة" }, performance: 4.3, localities: ["Akouda", "Bouficha", "Enfidha", "Hammam Sousse", "Kalâa Kebira", "M'saken", "Sousse Jawhara", "Sousse Médina", "Sousse Riadh"] },
      { id: "tataouine", names: { fr: "Tataouine", en: "Tataouine", ar: "تطاوين" }, performance: 3.2, localities: ["Bir Lahmar", "Dehiba", "Ghomrassen", "Remada", "Tataouine Nord", "Tataouine Sud"] },
      { id: "tozeur", names: { fr: "Tozeur", en: "Tozeur", ar: "توزر" }, performance: 3.5, localities: ["Degache", "Hazoua", "Nefta", "Tameghza", "Tozeur"] },
      { id: "tunis", names: { fr: "Tunis", en: "Tunis", ar: "تونس العاصمة" }, performance: 4.4, localities: ["Bab Bhar", "Bab Souika", "Carthage", "Cité El Khadra", "El Menzah", "El Omrane", "La Goulette", "La Marsa", "Le Bardo", "Le Kram", "Médina", "Sidi El Béchir"] },
      { id: "zaghouan", names: { fr: "Zaghouan", en: "Zaghouan", ar: "زغوان" }, performance: 3.6, localities: ["Bir Mcherga", "El Fahs", "Nadhour", "Saouaf", "Zaghouan", "Zriba"] }
    ]
  },
  {
    code: "FR",
    flag: "🇫🇷",
    names: { fr: "France", en: "France", ar: "فرنسا" },
    regions: [
      { id: "idf", names: { fr: "Île-de-France", en: "Ile-de-France", ar: "إيل دي فرانس" }, performance: 4.3, localities: ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Versailles", "Nanterre", "Créteil"] },
      { id: "paca", names: { fr: "Provence-Alpes-Côte d'Azur", en: "PACA", ar: "باكا" }, performance: 4.1, localities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Cannes", "Avignon"] },
      { id: "auvergne", names: { fr: "Auvergne-Rhône-Alpes", en: "Auvergne-Rhone-Alpes", ar: "أوفرن رون ألب" }, performance: 4.0, localities: ["Lyon", "Grenoble", "Saint-Étienne", "Clermont-Ferrand", "Annecy"] },
      { id: "occitanie", names: { fr: "Occitanie", en: "Occitanie", ar: "أوكسيتاني" }, performance: 3.9, localities: ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers"] }
    ]
  },
  {
    code: "CI",
    flag: "🇨🇮",
    names: { fr: "Côte d'Ivoire", en: "Ivory Coast", ar: "ساحل العاج" },
    regions: [
      { id: "abidjan", names: { fr: "Abidjan", en: "Abidjan", ar: "أبيدجان" }, performance: 4.2, localities: ["Cocody", "Plateau", "Yopougon", "Marcory", "Treichville", "Koumassi", "Abobo"] },
      { id: "yamoussoukro", names: { fr: "Yamoussoukro", en: "Yamoussoukro", ar: "ياموسوكرو" }, performance: 3.8, localities: ["Yamoussoukro Commune", "Attiégouakro"] },
      { id: "bouake", names: { fr: "Bouaké", en: "Bouake", ar: "بواكي" }, performance: 3.6, localities: ["Bouaké Ville", "Béoumi", "Sakassou", "Sakassou Commune"] }
    ]
  },
  {
    code: "MA",
    flag: "🇲🇦",
    names: { fr: "Maroc", en: "Morocco", ar: "المغرب" },
    regions: [
      { id: "casablanca", names: { fr: "Casablanca-Settat", en: "Casablanca", ar: "الدار البيضاء سطات" }, performance: 4.3, localities: ["Casablanca Anfa", "Hay Hassani", "Maârif", "Mohammédia", "Settat", "El Jadida"] },
      { id: "rabat", names: { fr: "Rabat-Salé-Kénitra", en: "Rabat", ar: "الرباط سلا القنيطرة" }, performance: 4.2, localities: ["Rabat Agdal", "Salé", "Kénitra", "Témara", "Skhirat"] },
      { id: "marrakech", names: { fr: "Marrakech-Safi", en: "Marrakech", ar: "مراكش آسفي" }, performance: 4.0, localities: ["Marrakech Médina", "Gueliz", "Hivernage", "Safi", "Essaouira"] }
    ]
  }
];
