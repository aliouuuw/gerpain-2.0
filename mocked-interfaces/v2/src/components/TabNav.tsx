export type TabId = 'accueil' | 'livraisons' | 'encaissements' | 'stock' | 'rh' | 'parametres';

export interface TabNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; hint?: string }[] = [
  { id: 'accueil', label: 'Accueil' },
  { id: 'livraisons', label: 'Livraisons', hint: 'Sorties du jour' },
  { id: 'encaissements', label: 'Encaissements', hint: 'Argent reçu' },
  { id: 'stock', label: 'Stock' },
  { id: 'rh', label: 'Équipe' },
  { id: 'parametres', label: 'Réglages' },
];

export function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav" aria-label="Navigation principale">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-nav-item ${tab.id === activeTab ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          title={tab.hint}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
