# Settings for the free-item sniper. Change these anytime.

# Where you are (default: downtown Toronto). Items farther than MAX_KM get skipped.
HOME_LAT = 43.6532
HOME_LON = -79.3832
MAX_KM = 30

# Ignore listings older than this (free stuff goes fast).
MAX_AGE_HOURS = 6

# Skip listings whose title/description contains any of these words.
BLOCKED_WORDS = [
    # junk / services / spam
    "scrap", "pick up service", "pickup service", "removal", "junk", "garbage",
    "insulation", "firewood", "wood skid", "skid", "pallet", "soil", "dirt",
    "fill", "mulch", "wanted", "looking for", "iso", "in search of",
    "food", "snacks", "menstruation", "diapers",
    # too big for you
    "mattress", "box spring", "sectional", "dresser", "wardrobe", "armoire",
    "fridge", "refrigerator", "freezer", "stove", "oven", "washer", "dryer",
    "dishwasher", "piano", "bed frame", "bunk bed", "hot tub", "boat",
    "shed", "headboard", "head board",
]

# Skip "free" listings that actually want money, a trade, or an offer.
NOT_REALLY_FREE_WORDS = [
    "obo", "or best offer", "best offer", "make an offer", "make me an offer",
    "make offer", "offers", "negotiable", "nego", "neg", "firm", "asking",
    "price", "priced", "cheap", "for sale", "selling", "sell", "pay",
    "paid", "fee", "deposit", "e-transfer", "etransfer", "cash", "donation",
    "trade", "swap", "exchange", "in exchange", "free with purchase",
    "with purchase", "buy", "discount", "rent", "rental", "lease",
]


# Kijiji GTA free stuff, newest first.
KIJIJI_URL = (
    "https://www.kijiji.ca/b-free-stuff/gta-greater-toronto-area/"
    "c17220001l1700272?sort=dateDesc"
)

# Craigslist Toronto free stuff.
CRAIGSLIST_URL = "https://www.craigslist.org/search/area/toronto?cat=zip"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)

SEEN_FILE = "seen.json"
