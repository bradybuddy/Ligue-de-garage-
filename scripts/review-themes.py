# Classe replica/reviews.csv par thèmes (mots-clés EN + FR) et pondère : note basse et récence comptent plus.
import csv, re, sys, json
from collections import defaultdict
T = {
 "plantage / ne s'ouvre plus": r"crash|won.?t (load|open)|not (opening|loading)|can.?t (get back in|open)|freez|hang|spins|unusable|shuts down|ouvrir|won.?t work|doesn.?t work|stopped working|not working|n.?ouvre",
 "bogues en général": r"glitch|bug(gy|s)?\b|broken|unstable",
 "mises à jour trop fréquentes ou qui cassent": r"(so many|too many|constant|every (other )?day).{0,20}update|update.{0,30}(broke|gone|lost|removed|reset|won.?t|can.?t|no longer|now)|mise à jour|after (the )?(latest |last |new )?update",
 "notifications pas reçues": r"(never|don.?t|didn.?t|not) (get|getting|receiv\w*)[^.]{0,30}notif|notif\w*[^.]{0,30}(never|not) (work|com|arriv)|missed alerts|no notification",
 "trop de courriels/avis, impossible de couper": r"spam|too many (e-?mails|emails|notifications|texts|messages)|unsubscribe|can.?t (turn off|disable|stop)[^.]{0,20}(e-?mail|notif|text)|disable all notifications|countless e-?mails|constant alerts|\d+ e-?mails",
 "payant / PRO / prix": r"\bpro\b|paywall|pay (for|to)|paid version|charg(e|ing)|subscription|expensive|price|money|\$\d|premium",
 "publicités": r"\bads?\b|advert|pub\b",
 "chat / messages": r"\bchat|chatter|message|\bim\b|gif|emoji|react",
 "horaire / calendrier / heure": r"calendar|schedule|time ?zone|daylight|\bdst\b|ical|google cal|an hour (early|late)",
 "spares / liste d'attente": r"spare|wait ?list|sub(stitute)?s?\b",
 "stats / pointage": r"\bstat|score|goals|assists",
 "paiements / frais": r"payment|e-?transfer|fees?\b|collect|venmo|paypal",
 "connexion / compte": r"log ?in|sign ?in|password|account|connecter|logged out|log out",
 "support lent": r"support|customer service|respon(d|se)|no reply|contacted",
 "lent / pas intuitif": r"slow|sluggish|lag|intuitive|confus|clunky|hard to (use|navigate)|complicated",
 "présences IN/OUT": r"attendance|rsvp|check.?(in|out)|\bmaybe\b|\bin/out\b",
 "fonction retirée": r"(removed|took away|got rid of|no longer|disappear\w*|gone)",
 "tournée (bière)": r"drink|beer|bi[eè]re",
}
rows = list(csv.DictReader(open("replica/reviews.csv", encoding="utf-8")))
def w(r):
    rt = {"1": 3, "2": 2, "3": 1}.get(r["rating"], 0.5)
    y = r["date"][:4]
    rec = 2 if y >= "2025" else 1.5 if y >= "2023" else 1
    return rt * rec
res = defaultdict(lambda: {"n": 0, "score": 0.0, "sources": set(), "low": 0, "ids": []})
unmatched = []
for i, r in enumerate(rows):
    txt = r["text"].lower(); hit = False
    for name, pat in T.items():
        if re.search(pat, txt):
            hit = True; d = res[name]; d["n"] += 1; d["score"] += w(r)
            d["sources"].add(r["source"].split("-")[0]); d["ids"].append(i)
            if r["rating"] in ("1", "2"): d["low"] += 1
    if not hit and r["rating"] in ("1", "2", "3"): unmatched.append(i)
out = sorted(res.items(), key=lambda kv: -kv[1]["score"])
for name, d in out:
    print(f"{d['score']:6.1f}  n={d['n']:3d}  bas={d['low']:3d}  sources={','.join(sorted(d['sources']))}  {name}")
print("\nNon classés (1-3 étoiles) :", len(unmatched))
for i in unmatched: print(f"  [{rows[i]['rating']}★ {rows[i]['date']}] {rows[i]['text'][:160]}")
json.dump({k: v["ids"] for k, v in res.items()}, open(sys.argv[1], "w"))
