import { useState, useEffect } from 'react';
import './App.css';
import { Header } from './components/Header';
import { DayContextBar } from './components/DayContextBar';
import { TabNav, type TabId } from './components/TabNav';
import { Home } from './pages/Home';
import { Livraisons } from './pages/Livraisons';
import { Encaissements } from './pages/Encaissements';
import { Stock } from './pages/Stock';
import { RH } from './pages/RH';
import { Parametres } from './pages/Parametres';
import { getStoredTheme, setStoredTheme, themes, type Theme } from './themes';

const pageMeta: Record<TabId, { title: string; subtitle: string }> = {
  accueil: {
    title: 'Accueil',
    subtitle: 'Ce qu’il reste à faire aujourd’hui',
  },
  livraisons: {
    title: 'Livraisons',
    subtitle: 'Quantités sorties et vendues par agent (Matin / Soir)',
  },
  encaissements: {
    title: 'Encaissements',
    subtitle: 'Argent reçu par rapport à ce qui était attendu',
  },
  stock: {
    title: 'Stock',
    subtitle: 'Quantités en dépôt',
  },
  rh: {
    title: 'Équipe',
    subtitle: 'Livreurs, caissiers et contacts',
  },
  parametres: {
    title: 'Réglages',
    subtitle: 'Boulangerie, produits et notifications',
  },
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('accueil');
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.className = theme.className;
    }
    setStoredTheme(theme);
  }, [theme]);

  const handleThemeChange = (themeId: string) => {
    const next = themes.find((t) => t.id === themeId);
    if (next) setTheme(next);
  };

  return (
    <>
      <Header themeId={theme.id} onThemeChange={handleThemeChange} />
      <DayContextBar />
      <TabNav activeTab={activeTab} onChange={setActiveTab} />
      <div className="page-header">
        <h1>{pageMeta[activeTab].title}</h1>
        <p>{pageMeta[activeTab].subtitle}</p>
      </div>
      <div className="app-body">
        {activeTab === 'accueil' && <Home onNavigate={setActiveTab} />}
        {activeTab === 'livraisons' && <Livraisons onNavigate={setActiveTab} />}
        {activeTab === 'encaissements' && <Encaissements />}
        {activeTab === 'stock' && <Stock />}
        {activeTab === 'rh' && <RH />}
        {activeTab === 'parametres' && <Parametres />}
      </div>
    </>
  );
}

export default App;
