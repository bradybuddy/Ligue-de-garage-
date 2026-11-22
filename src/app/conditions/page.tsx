import { APP_NAME, LEGAL } from "@/lib/brand";
import { LegalPage } from "@/components/app/legal";

export const metadata = { title: `Conditions d'utilisation · ${APP_NAME}` };

// ÉBAUCHE À FAIRE RELIRE PAR UN AVOCAT avant la mise en ligne.
// Les engagements de prix et de facturation viennent de replica/launch/pricing.md.
export default function Conditions() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>En utilisant {APP_NAME}, exploité par {LEGAL.entity}, tu acceptes ces conditions. Elles sont écrites pour être lues : si quelque chose n&apos;est pas clair, écris à {LEGAL.supportEmail}.</p>

      <h2>Le service</h2>
      <p>{APP_NAME} aide les équipes et les ligues de hockey de garage à gérer leurs présences, leurs spares, leurs messages et leur horaire. On fait tout pour que les rappels partent à temps, mais on ne peut pas garantir qu&apos;un texto, un courriel ou une notif arrive toujours : ils passent par des réseaux qu&apos;on ne contrôle pas.</p>

      <h2>Ton compte</h2>
      <ul>
        <li>Tu dois être majeur.</li>
        <li>Tu es responsable de ton mot de passe.</li>
        <li>Si tu ajoutes des joueurs avec leur cellulaire ou leur courriel, tu confirmes qu&apos;ils sont d&apos;accord pour recevoir les rappels de l&apos;équipe. Chacun peut répondre STOP ou se désabonner en un clic.</li>
      </ul>

      <h2>Ce qui n&apos;est pas permis</h2>
      <p>Harceler, menacer ou insulter quelqu&apos;un dans le chat ; envoyer du pourriel ; tenter d&apos;accéder aux équipes des autres ; nuire au service. On peut suspendre un compte qui le fait.</p>

      <h2>Ton contenu</h2>
      <p>Tes messages et tes données restent à toi. Tu nous permets seulement de les conserver et de les afficher à ton équipe pour faire marcher l&apos;appli. Voir aussi la <a href="/confidentialite" className="font-semibold text-accent-strong underline underline-offset-4">politique de confidentialité</a>.</p>

      <h2>Prix</h2>
      <ul>
        <li>Le plan <strong>Équipe</strong> est gratuit. Une fonction du plan Équipe ne deviendra jamais payante.</li>
        <li>Les plans payants sont facturés à plat par équipe, jamais par joueur, taxes en sus.</li>
        <li>Tu peux annuler en un clic dans ton compte. On t&apos;écrit 7 jours avant chaque renouvellement annuel.</li>
        <li>Annulé dans les 14 jours après un paiement annuel : remboursé au complet.</li>
        <li>Si tu arrêtes de payer, ton équipe revient au plan gratuit ; rien n&apos;est effacé.</li>
      </ul>

      <h2>Changements</h2>
      <p>Si on change ces conditions de façon importante, on t&apos;avise au moins 30 jours d&apos;avance dans l&apos;appli. Une fonction retirée est annoncée d&apos;avance, elle aussi.</p>

      <h2>Responsabilité</h2>
      <p>Dans la mesure permise par la loi, notre responsabilité se limite au montant que tu nous as payé dans les 12 derniers mois. Rien dans ces conditions ne limite tes droits prévus par la Loi sur la protection du consommateur du Québec.</p>

      <h2>Droit applicable</h2>
      <p>Ces conditions sont régies par les lois du Québec et du Canada.</p>
    </LegalPage>
  );
}
