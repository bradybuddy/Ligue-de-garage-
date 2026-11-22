import { APP_NAME, LEGAL } from "@/lib/brand";
import { LegalPage } from "@/components/app/legal";

export const metadata = { title: `Confidentialité · ${APP_NAME}` };

// Politique de confidentialité, Loi 25 (Québec) et LPRPDE (Canada).
// ÉBAUCHE À FAIRE RELIRE PAR UN AVOCAT avant la mise en ligne. Chaque fournisseur listé ici est réellement utilisé par le code.
const processors = [
  { who: "Supabase", what: "Base de données et comptes (nom, courriel, cellulaire, présences, messages)", where: "Canada (région ca-central-1)" },
  { who: "Vercel", what: "Hébergement de l'appli ; journaux techniques (adresse IP, navigateur) gardés peu de temps", where: "États-Unis" },
  { who: "Twilio", what: "Envoi et réception des textos (numéro de cellulaire, texte du message)", where: "États-Unis" },
  { who: "Resend", what: "Envoi des courriels (adresse courriel, texte du courriel)", where: "États-Unis" },
  { who: "Sentry", what: "Rapports d'erreurs techniques, sans le contenu des messages", where: "États-Unis" },
  { who: "Apple, Google, Mozilla", what: "Livraison des notifications (adresse d'abonnement et contenu chiffré de la notif)", where: "États-Unis" },
  { who: "GIPHY", what: "Recherche de GIF dans le chat : seul le mot cherché est envoyé, jamais ton nom", where: "États-Unis" },
];

export default function Confidentialite() {
  return (
    <LegalPage title="Confidentialité">
      <p>{APP_NAME} sert à savoir qui est là au prochain match. On recueille le moins de renseignements possible, on ne les vend jamais, et il n&apos;y a pas de pub ni de pistage.</p>

      <h2>Qui est responsable</h2>
      <p>{LEGAL.entity}, {LEGAL.address}. Responsable de la protection des renseignements personnels : {LEGAL.privacyOfficer}. Pour toute question ou demande : {LEGAL.contactEmail}.</p>

      <h2>Ce qu&apos;on recueille, et pourquoi</h2>
      <ul>
        <li><strong>Ton nom</strong> : pour que ton équipe te reconnaisse dans l&apos;alignement.</li>
        <li><strong>Ton courriel</strong> : pour ton compte et, si tu le veux, les rappels par courriel.</li>
        <li><strong>Ton cellulaire</strong> : pour les rappels par texto et ta réponse Y ou N. Ton gérant peut l&apos;entrer pour toi ; tu peux répondre STOP en tout temps.</li>
        <li><strong>Tes réponses</strong> (IN, OUT, liste d&apos;attente), ta classe (régulier, spare…), ton numéro de chandail et ta position.</li>
        <li><strong>Tes messages</strong> dans le chat de l&apos;équipe et tes réactions.</li>
        <li><strong>La tournée de bières</strong> : qui apporte la bière et combien de fois dans la saison.</li>
        <li><strong>Tes appareils abonnés aux notifs</strong> : une adresse technique par appareil, sans localisation.</li>
      </ul>
      <p>On ne recueille pas ta localisation, tes contacts ni ta date de naissance. Pas de témoins (cookies) publicitaires : le seul témoin sert à garder ta session ouverte.</p>

      <h2>Qui voit quoi</h2>
      <p>Les membres de ton équipe voient ton nom, tes réponses et tes messages. Ton cellulaire et ton courriel sont visibles seulement par les gérants de l&apos;équipe. Dans une ligue, le commissaire voit les équipes et l&apos;horaire, pas tes coordonnées.</p>

      <h2>Nos fournisseurs</h2>
      <p>Ces entreprises traitent des renseignements pour nous, seulement pour faire marcher l&apos;appli, sous contrat. Certaines sont à l&apos;extérieur du Québec : avant de leur confier des renseignements, on a évalué les risques, comme la Loi 25 l&apos;exige.</p>
      <table>
        <thead><tr><th scope="col">Fournisseur</th><th scope="col">Pour quoi</th><th scope="col">Où</th></tr></thead>
        <tbody>{processors.map((p) => <tr key={p.who}><td>{p.who}</td><td>{p.what}</td><td>{p.where}</td></tr>)}</tbody>
      </table>

      <h2>Combien de temps</h2>
      <ul>
        <li>Ton compte et tes données : tant que ton compte existe.</li>
        <li>Quand tu supprimes ton compte, ton profil, ton courriel, ton cellulaire et tes appareils sont effacés tout de suite. Dans l&apos;historique de ton équipe (matchs passés, messages du chat), ton nom est remplacé par « Ancien joueur ».</li>
        <li>Les textos, courriels et notifs envoyés : 90 jours dans notre journal d&apos;envoi, puis effacés.</li>
        <li>Les copies de sécurité de la base : 7 jours.</li>
      </ul>

      <h2>Tes droits</h2>
      <p>Tu peux demander d&apos;accéder à tes renseignements, de les corriger, de les recevoir dans un format courant, ou de les effacer. Tu peux supprimer ton compte toi-même dans <strong>Compte</strong>, et choisir chaque avis (notif, texto, courriel) au même endroit. Pour le reste, écris à {LEGAL.contactEmail} ; on répond en moins de 30 jours. Si tu n&apos;es pas satisfait, tu peux porter plainte à la Commission d&apos;accès à l&apos;information du Québec.</p>

      <h2>Incident</h2>
      <p>En cas d&apos;incident de confidentialité qui présente un risque sérieux, on avise les personnes touchées et la Commission d&apos;accès à l&apos;information, comme la loi le demande.</p>

      <h2>Âge</h2>
      <p>L&apos;appli s&apos;adresse aux adultes. La tournée de bières est réservée aux personnes d&apos;âge légal.</p>
    </LegalPage>
  );
}
