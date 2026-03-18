import { useState } from 'react';
import { Database, FolderOpen, Plus, AlertCircle, Mail, Lock, Zap } from 'lucide-react';
import { Modal } from './ui/Modal';

// ── Privacy Policy ────────────────────────────────────────────────────────────

function PrivacyPolicy() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4 text-sm leading-relaxed">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">Datenschutzerklärung</h2>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">1. Verantwortlicher</h3>
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer nationaler Datenschutzgesetze sowie sonstiger datenschutzrechtlicher Bestimmungen ist:
        </p>
        <p className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 italic">
          [Name]<br />
          [Straße, Hausnummer]<br />
          [PLZ Ort]<br />
          [E-Mail-Adresse]
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">2. Allgemeines zur Datenverarbeitung</h3>
        <p>
          Lister ist eine lokal betriebene Webanwendung. Alle von Ihnen eingegebenen Daten (Abonnentenlisten, Kampagnen, Einstellungen) werden ausschließlich lokal in Ihrem Browser gespeichert und verarbeitet. Eine Übermittlung dieser Daten an unsere Server oder Dritte findet nicht statt.
        </p>
        <p>
          Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Eine Verarbeitung personenbezogener Daten unserer Nutzer erfolgt nur nach Einwilligung des Nutzers oder sofern eine Verarbeitung durch gesetzliche Vorschriften gestattet ist.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">3. Bereitstellung der Website und Erstellung von Logfiles</h3>
        <p>
          Bei jedem Aufruf unserer Website erfasst unser System automatisiert Daten und Informationen des abrufenden Computersystems. Folgende Daten werden dabei erhoben:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Informationen über den Browsertyp und die verwendete Version</li>
          <li>Das Betriebssystem des Nutzers</li>
          <li>Die IP-Adresse des Nutzers (in anonymisierter Form)</li>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>Websites, von denen das System des Nutzers auf unsere Internetseite gelangt</li>
        </ul>
        <p className="mt-2">
          Die Speicherung in Logfiles erfolgt, um die Funktionsfähigkeit der Website sicherzustellen. Zudem dienen uns die Daten zur Optimierung der Website und zur Sicherstellung der Sicherheit unserer informationstechnischen Systeme. Eine Auswertung der Daten zu Marketingzwecken findet nicht statt.
        </p>
        <p className="mt-2">
          Rechtsgrundlage für die vorübergehende Speicherung der Daten und der Logfiles ist Art. 6 Abs. 1 lit. f DSGVO. Die Daten werden gelöscht, sobald sie für die Erreichung des Zweckes ihrer Erhebung nicht mehr erforderlich sind, spätestens nach 7 Tagen.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">4. Lokale Speicherung (LocalStorage)</h3>
        <p>
          Diese Website verwendet die localStorage-Funktion Ihres Browsers ausschließlich zur Speicherung Ihrer Anzeigeeinstellungen (z. B. Farbschema Hell/Dunkel). Dabei werden keine personenbezogenen Daten erfasst. Die Nutzung von localStorage ist technisch notwendig und erfordert keine Einwilligung nach Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p className="mt-2">
          Sie können die gespeicherten Daten jederzeit über die Entwicklertools Ihres Browsers einsehen und löschen.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">5. Lokale Datenbankdateien</h3>
        <p>
          Die Anwendung Lister speichert alle Nutzerdaten (Abonnenten, Listen, Kampagnen) ausschließlich lokal auf Ihrem Gerät in einer SQLite-Datenbankdatei. Diese Datei wird weder an uns noch an Dritte übertragen. Die Verarbeitung findet vollständig in Ihrem Browser statt (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung / Nutzung der Software).
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">6. Keine Weitergabe an Dritte</h3>
        <p>
          Eine Übermittlung Ihrer personenbezogenen Daten an Dritte zu anderen als den im Folgenden aufgeführten Zwecken findet nicht statt. Wir geben Ihre personenbezogenen Daten nur an Dritte weiter, wenn Sie eine ausdrückliche Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO erteilt haben oder eine gesetzliche Verpflichtung zur Weitergabe besteht (Art. 6 Abs. 1 lit. c DSGVO).
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">7. Keine Analyse- oder Tracking-Dienste</h3>
        <p>
          Diese Website verwendet keine Analyse- oder Tracking-Dienste (wie z. B. Google Analytics, Matomo o. Ä.). Es werden keine Nutzerprofile erstellt und keine Daten zu Werbezwecken erhoben oder weitergegeben.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">8. Rechte der betroffenen Personen</h3>
        <p>Ihnen stehen gegenüber dem Verantwortlichen folgende Rechte zu:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Sie haben das Recht, Auskunft über die zu Ihrer Person gespeicherten Daten zu erhalten.</li>
          <li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO): Sie haben das Recht, unrichtige Daten berichtigen zu lassen.</li>
          <li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Sie haben das Recht, die Löschung Ihrer Daten zu verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</li>
          <li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
          <li><strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
          <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Sie haben das Recht, der Verarbeitung Ihrer Daten zu widersprechen.</li>
        </ul>
        <p className="mt-2">
          Zur Geltendmachung Ihrer Rechte wenden Sie sich bitte an die oben genannte Kontaktadresse des Verantwortlichen.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">9. Beschwerderecht bei einer Aufsichtsbehörde</h3>
        <p>
          Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt, haben Sie gemäß Art. 77 DSGVO das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren – insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">10. Aktualität und Änderung dieser Datenschutzerklärung</h3>
        <p>
          Diese Datenschutzerklärung ist aktuell gültig. Durch die Weiterentwicklung unserer Website oder aufgrund geänderter gesetzlicher bzw. behördlicher Vorgaben kann es notwendig werden, diese Datenschutzerklärung zu ändern. Die jeweils aktuelle Datenschutzerklärung kann jederzeit auf dieser Website abgerufen werden.
        </p>
      </section>
    </div>
  );
}

// ── Imprint ───────────────────────────────────────────────────────────────────

function Imprint() {
  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4 leading-relaxed">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">Impressum</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">Angaben gemäß § 5 TMG</p>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Anbieter</h3>
        <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 italic">
          [Vor- und Nachname / Firmenname]<br />
          [Straße, Hausnummer]<br />
          [PLZ Ort]<br />
          [Land]
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Kontakt</h3>
        <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 italic">
          E-Mail: [E-Mail-Adresse]
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
        <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 italic">
          [Vor- und Nachname]<br />
          [Anschrift wie oben]
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Streitschlichtung</h3>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <span className="text-indigo-600 dark:text-indigo-400">https://ec.europa.eu/consumers/odr/</span>.
          Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
        <p className="mt-2">
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Haftung für Inhalte</h3>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Haftung für Links</h3>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Urheberrecht</h3>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </section>
    </div>
  );
}

// ── LandingPage ───────────────────────────────────────────────────────────────

interface LandingPageProps {
  onOpenFile: () => void;
  onNewFile: () => void;
  error: string;
  fsApi: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LandingPage({ onOpenFile, onNewFile, error, fsApi, fileInputRef, onFileInputChange }: LandingPageProps) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showImprint, setShowImprint] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-white dark:bg-gray-900">
      {/* Left panel — marketing */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-indigo-600 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/40" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-700/50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Lister</span>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Newsletter management,<br />
            <span className="text-indigo-200">without the cloud.</span>
          </h1>
          <p className="text-indigo-200 text-lg mb-10 leading-relaxed">
            Send campaigns, manage subscribers, and track lists — all stored in a single file on your machine.
          </p>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mt-0.5">
                <Lock size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">100% local, 100% private</p>
                <p className="text-indigo-300 text-sm mt-0.5">Your data never leaves your device. No accounts, no subscriptions, no tracking.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mt-0.5">
                <Mail size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Your SMTP, your domain</p>
                <p className="text-indigo-300 text-sm mt-0.5">Connect any SMTP server and send from your own domain. No shared infrastructure, no deliverability surprises.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mt-0.5">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Lightweight and fast</p>
                <p className="text-indigo-300 text-sm mt-0.5">One SQLite file. Import thousands of subscribers in seconds. No bloat.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative" />
      </div>

      {/* Right panel — actions */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-lg">Lister</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Get started</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Open an existing database or create a new one.</p>

            <div className="space-y-3">
              <button
                onClick={onNewFile}
                className="w-full flex items-center gap-4 px-5 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Plus size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Create new file</p>
                  <p className="text-xs text-indigo-300 mt-0.5">Start with an empty database</p>
                </div>
              </button>

              <button
                onClick={onOpenFile}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                  <FolderOpen size={20} className="text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Open existing file</p>
                  <p className="text-xs text-gray-400 mt-0.5">Load a .sqlite database file</p>
                </div>
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="mt-6 flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">💡</span>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                {fsApi
                  ? <>For the best experience, use <strong>Chrome</strong>, <strong>Edge</strong>, or another Chromium-based browser. They support live file saving — your changes are written directly to disk as you work.</>
                  : <>Your browser doesn't support live file saving. Changes are kept in memory — use the <strong>Save</strong> button regularly to download your file. For live saving, switch to <strong>Chrome</strong> or <strong>Edge</strong>.</>
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-6">
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Datenschutz
          </button>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <button
            onClick={() => setShowImprint(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Impressum
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sqlite,.db"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Privacy modal */}
      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Datenschutzerklärung" size="lg">
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <PrivacyPolicy />
        </div>
      </Modal>

      {/* Imprint modal */}
      <Modal isOpen={showImprint} onClose={() => setShowImprint(false)} title="Impressum" size="lg">
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <Imprint />
        </div>
      </Modal>
    </div>
  );
}
