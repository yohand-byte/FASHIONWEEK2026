import React, { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, Search, Sparkles, Download, ChevronDown, ChevronUp, ShoppingBag, Store, Users } from 'lucide-react';
import catalogDataJSON from './catalogData.json';

const CatalogApp = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSexe, setSelectedSexe] = useState('all');
  const [selectedCategorie, setSelectedCategorie] = useState('all');
  const [sortMode, setSortMode] = useState('all'); // all, grossiste, club, detail
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 50;

  const USD_TO_ILS = 3.03;
  const catalogData = catalogDataJSON;

  // Calculer les prix NET (sans transport)
  const productsWithNet = useMemo(() => {
    return catalogData.map(p => {
      const prix_net_ils = p.prix_achat_ils / 1.08;
      const transport_ils = p.prix_achat_ils - prix_net_ils;
      const prix_net_usd = prix_net_ils * 0.33;
      const transport_usd = transport_ils * 0.33;
      
      return {
        ...p,
        prix_net_ils: parseFloat(prix_net_ils.toFixed(2)),
        prix_net_usd: parseFloat(prix_net_usd.toFixed(2)),
        transport_ils: parseFloat(transport_ils.toFixed(2)),
        transport_usd: parseFloat(transport_usd.toFixed(2)),
      };
    });
  }, []);

  // Stats globales
  const stats = useMemo(() => {
    const validProducts = productsWithNet.filter(p => p.prix_grossiste);
    
    return {
      totalProducts: productsWithNet.length,
      avgNetILS: (productsWithNet.reduce((sum, p) => sum + p.prix_net_ils, 0) / validProducts.length).toFixed(2),
      avgTransportILS: (productsWithNet.reduce((sum, p) => sum + p.transport_ils, 0) / validProducts.length).toFixed(2),
      avgGrossiste: (productsWithNet.reduce((sum, p) => sum + (p.prix_grossiste || 0), 0) / validProducts.length).toFixed(2),
      avgClub: (productsWithNet.reduce((sum, p) => sum + (p.prix_club || 0), 0) / validProducts.length).toFixed(2),
      avgDetail: (productsWithNet.reduce((sum, p) => sum + (p.prix_detail || 0), 0) / validProducts.length).toFixed(2),
      avgMarginGrossiste: (productsWithNet.reduce((sum, p) => sum + (p.marge_grossiste_pct || 0), 0) / validProducts.length).toFixed(1),
      avgMarginClub: (productsWithNet.reduce((sum, p) => sum + (p.marge_club_pct || 0), 0) / validProducts.length).toFixed(1),
      avgMarginDetail: (productsWithNet.reduce((sum, p) => sum + (p.marge_detail_pct || 0), 0) / validProducts.length).toFixed(1),
    };
  }, [productsWithNet]);

  // Filtrer et trier
  const filteredProducts = useMemo(() => {
    let products = [...productsWithNet];
    
    if (searchTerm) {
      products = products.filter(p => 
        p.modele?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.couleur?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedSexe !== 'all') {
      products = products.filter(p => p.sexe === selectedSexe);
    }
    
    if (selectedCategorie !== 'all') {
      products = products.filter(p => p.sous_categorie === selectedCategorie);
    }

    // Tri selon le mode
    if (sortMode === 'grossiste') {
      products.sort((a, b) => (b.prix_grossiste || 0) - (a.prix_grossiste || 0));
    } else if (sortMode === 'club') {
      products.sort((a, b) => (b.prix_club || 0) - (a.prix_club || 0));
    } else if (sortMode === 'detail') {
      products.sort((a, b) => (b.prix_detail || 0) - (a.prix_detail || 0));
    }
    
    return products;
  }, [searchTerm, selectedSexe, selectedCategorie, sortMode, productsWithNet]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Analyse par sexe
  const sexeAnalysis = useMemo(() => {
    const map = new Map();
    productsWithNet.forEach(p => {
      const sexe = p.sexe || 'Non défini';
      if (!map.has(sexe)) {
        map.set(sexe, { name: sexe, count: 0 });
      }
      map.get(sexe).count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [productsWithNet]);

  // Top catégories
  const categorieAnalysis = useMemo(() => {
    const map = new Map();
    productsWithNet.forEach(p => {
      const cat = p.sous_categorie || 'Autre';
      if (!map.has(cat)) {
        map.set(cat, { name: cat, count: 0, avgMargin: 0 });
      }
      const c = map.get(cat);
      c.count++;
      c.avgMargin += p.marge_grossiste_pct || 0;
    });
    return Array.from(map.values()).map(c => ({
      ...c,
      avgMargin: parseFloat((c.avgMargin / c.count).toFixed(1))
    })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [productsWithNet]);

  const COLORS_PIE = ['#EC4899', '#F472B6', '#FB923C', '#A78BFA', '#F87171', '#FDA4AF', '#FCD34D', '#34D399'];

  const exportToCSV = () => {
    const headers = ['Modèle', 'Description', 'Couleur', 'Sexe', 'Catégorie', 
                     'Prix NET USD', 'Prix NET ILS', 'Transport USD', 'Transport ILS', 'Total USD', 'Total ILS',
                     'Prix Grossiste', 'Marge Grossiste ₪', 'Marge Grossiste %',
                     'Prix Club', 'Marge Club ₪', 'Marge Club %',
                     'Prix Détail', 'Marge Détail ₪', 'Marge Détail %'];
    const rows = filteredProducts.map(p => [
      p.modele, p.description, p.couleur, p.sexe, p.sous_categorie,
      p.prix_net_usd, p.prix_net_ils, p.transport_usd, p.transport_ils, p.prix_achat_usd, p.prix_achat_ils,
      p.prix_grossiste, p.marge_grossiste_ils, p.marge_grossiste_pct,
      p.prix_club, p.marge_club_ils, p.marge_club_pct,
      p.prix_detail, p.marge_detail_ils, p.marge_detail_pct
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalogue_analyse_complete.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-[95rem] mx-auto">
        
        {/* Header Élégant */}
        <div className="mb-8 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-xl p-8 md:p-12 border border-pink-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-10 h-10 text-pink-500" />
                <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
                  Collection Été 2026
                </h1>
              </div>
              <p className="text-gray-600 text-lg font-medium">
                {stats.totalProducts} produits • Analyse complète des prix et marges
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 shadow-lg border border-amber-200">
              <p className="text-sm font-bold text-amber-900 mb-1">Taux de change</p>
              <p className="text-3xl font-black text-amber-900">1 USD = {USD_TO_ILS} ₪</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl p-6 shadow-xl border border-pink-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Total Produits</p>
              <Package className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-4xl font-black text-white">{stats.totalProducts}</p>
            <p className="text-pink-100 text-sm mt-2 font-medium">Références uniques</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl p-6 shadow-xl border border-purple-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Prix NET Moyen</p>
              <DollarSign className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-4xl font-black text-white">{stats.avgNetILS} ₪</p>
            <p className="text-purple-100 text-sm mt-2 font-medium">Sans transport</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl p-6 shadow-xl border border-blue-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Transport Moyen</p>
              <TrendingUp className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-4xl font-black text-white">{stats.avgTransportILS} ₪</p>
            <p className="text-blue-100 text-sm mt-2 font-medium">+8% du coût</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-6 shadow-xl border border-emerald-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Prix Détail Moyen</p>
              <Store className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-4xl font-black text-white">{stats.avgDetail} ₪</p>
            <p className="text-emerald-100 text-sm mt-2 font-medium">Marge {stats.avgMarginDetail}%</p>
          </div>
        </div>

        {/* 3 CARTES DÉTAILLÉES - LE COEUR DE L'APP */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* CARTE GROSSISTE */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-pink-200 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800">Prix Grossiste</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <p className="text-xs font-bold text-pink-700 mb-2">PRIX D'ACHAT NET</p>
                <p className="text-lg font-black text-gray-800">${stats.avgNetILS * 0.33} / {stats.avgNetILS} ₪</p>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-bold text-orange-700 mb-2">COÛT TRANSPORT +8%</p>
                <p className="text-lg font-black text-gray-800">${stats.avgTransportILS * 0.33} / {stats.avgTransportILS} ₪</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 mb-2">PRIX D'ACHAT TOTAL</p>
                <p className="text-lg font-black text-gray-800">${(parseFloat(stats.avgNetILS) * 0.33 + parseFloat(stats.avgTransportILS) * 0.33).toFixed(2)} / {(parseFloat(stats.avgNetILS) + parseFloat(stats.avgTransportILS)).toFixed(2)} ₪</p>
              </div>
              
              <div className="h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent my-4"></div>
              
              <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl p-5 border-2 border-pink-300">
                <p className="text-sm font-bold text-pink-800 mb-2">PRIX DE VENTE</p>
                <p className="text-3xl font-black text-pink-600 mb-3">{stats.avgGrossiste} ₪</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-pink-700">Marge brute:</span>
                  <span className="text-lg font-black text-pink-600">{stats.avgMarginGrossiste}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARTE CLUB */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-purple-200 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800">Prix Club</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-bold text-purple-700 mb-2">PRIX D'ACHAT NET</p>
                <p className="text-lg font-black text-gray-800">${stats.avgNetILS * 0.33} / {stats.avgNetILS} ₪</p>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-bold text-orange-700 mb-2">COÛT TRANSPORT +8%</p>
                <p className="text-lg font-black text-gray-800">${stats.avgTransportILS * 0.33} / {stats.avgTransportILS} ₪</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 mb-2">PRIX D'ACHAT TOTAL</p>
                <p className="text-lg font-black text-gray-800">${(parseFloat(stats.avgNetILS) * 0.33 + parseFloat(stats.avgTransportILS) * 0.33).toFixed(2)} / {(parseFloat(stats.avgNetILS) + parseFloat(stats.avgTransportILS)).toFixed(2)} ₪</p>
              </div>
              
              <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent my-4"></div>
              
              <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl p-5 border-2 border-purple-300">
                <p className="text-sm font-bold text-purple-800 mb-2">PRIX DE VENTE</p>
                <p className="text-3xl font-black text-purple-600 mb-3">{stats.avgClub} ₪</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-700">Marge brute:</span>
                  <span className="text-lg font-black text-purple-600">{stats.avgMarginClub}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARTE DÉTAIL */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-blue-200 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-800">Prix Détail</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-2">PRIX D'ACHAT NET</p>
                <p className="text-lg font-black text-gray-800">${stats.avgNetILS * 0.33} / {stats.avgNetILS} ₪</p>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-bold text-orange-700 mb-2">COÛT TRANSPORT +8%</p>
                <p className="text-lg font-black text-gray-800">${stats.avgTransportILS * 0.33} / {stats.avgTransportILS} ₪</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 mb-2">PRIX D'ACHAT TOTAL</p>
                <p className="text-lg font-black text-gray-800">${(parseFloat(stats.avgNetILS) * 0.33 + parseFloat(stats.avgTransportILS) * 0.33).toFixed(2)} / {(parseFloat(stats.avgNetILS) + parseFloat(stats.avgTransportILS)).toFixed(2)} ₪</p>
              </div>
              
              <div className="h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent my-4"></div>
              
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl p-5 border-2 border-blue-300">
                <p className="text-sm font-bold text-blue-800 mb-2">PRIX DE VENTE</p>
                <p className="text-3xl font-black text-blue-600 mb-3">{stats.avgDetail} ₪</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-700">Marge brute:</span>
                  <span className="text-lg font-black text-blue-600">{stats.avgMarginDetail}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-pink-100">
            <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              Répartition par Sexe
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sexeAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {sexeAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'white', border: '2px solid #FCA5A5', borderRadius: '16px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-purple-100">
            <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              Top Catégories
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categorieAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3E8FF" />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis dataKey="name" type="category" stroke="#6B7280" width={120} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ background: 'white', border: '2px solid #C4B5FD', borderRadius: '16px', fontWeight: 'bold' }} />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[0, 12, 12, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-pink-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-pink-50 border-2 border-pink-200 rounded-xl text-gray-800 placeholder-pink-400 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none font-medium transition"
              />
            </div>
            
            <select
              value={selectedSexe}
              onChange={(e) => setSelectedSexe(e.target.value)}
              className="px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none font-bold transition"
            >
              <option value="all">Tous les sexes</option>
              {Array.from(new Set(productsWithNet.map(p => p.sexe).filter(Boolean))).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            
            <select
              value={selectedCategorie}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none font-bold transition"
            >
              <option value="all">Toutes catégories</option>
              {Array.from(new Set(productsWithNet.map(p => p.sous_categorie).filter(Boolean))).sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="px-4 py-3 bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 focus:outline-none font-black transition"
            >
              <option value="all">Tous les produits</option>
              <option value="grossiste">📊 Tri par Grossiste</option>
              <option value="club">🎟️ Tri par Club</option>
              <option value="detail">🏪 Tri par Détail</option>
            </select>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-700 font-bold">
              <span className="text-3xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{filteredProducts.length}</span> produits • 
              Page {currentPage}/{totalPages}
            </p>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl transition font-black shadow-lg"
            >
              <Download className="w-5 h-5" />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-pink-100 shadow-2xl mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
                <tr>
                  <th className="text-left py-4 px-4 text-white font-black">Modèle</th>
                  <th className="text-left py-4 px-4 text-white font-black">Description</th>
                  <th className="text-left py-4 px-4 text-white font-black">Couleur</th>
                  <th className="text-left py-4 px-4 text-white font-black">Sexe</th>
                  <th className="text-left py-4 px-4 text-white font-black">Catégorie</th>
                  <th className="text-right py-4 px-4 text-white font-black">Prix NET</th>
                  <th className="text-right py-4 px-4 text-white font-black">Transport</th>
                  <th className="text-right py-4 px-4 text-white font-black">Total</th>
                  <th className="text-right py-4 px-4 text-white font-black">Grossiste</th>
                  <th className="text-right py-4 px-4 text-white font-black">Club</th>
                  <th className="text-right py-4 px-4 text-white font-black">Détail</th>
                  <th className="text-center py-4 px-4 text-white font-black">+</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p, idx) => (
                  <React.Fragment key={p.modele}>
                    <tr 
                      className={`border-b border-pink-100 hover:bg-pink-50 cursor-pointer transition ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-pink-50/30'
                      }`}
                      onClick={() => setExpandedProduct(expandedProduct === p.modele ? null : p.modele)}
                    >
                      <td className="py-3 px-4 font-mono font-black text-pink-600">{p.modele}</td>
                      <td className="py-3 px-4 text-gray-800 font-medium max-w-xs truncate">{p.description}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full text-xs font-bold border border-pink-200">
                          {p.couleur}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-bold text-xs">{p.sexe}</td>
                      <td className="py-3 px-4 text-gray-600 font-medium text-xs">{p.sous_categorie}</td>
                      <td className="py-3 px-4 text-right text-purple-600 font-black text-xs">${p.prix_net_usd} / {p.prix_net_ils}₪</td>
                      <td className="py-3 px-4 text-right text-orange-600 font-black text-xs">${p.transport_usd} / {p.transport_ils}₪</td>
                      <td className="py-3 px-4 text-right text-gray-800 font-black">${p.prix_achat_usd} / {p.prix_achat_ils}₪</td>
                      <td className="py-3 px-4 text-right text-pink-600 font-black">{p.prix_grossiste}₪</td>
                      <td className="py-3 px-4 text-right text-purple-600 font-black">{p.prix_club}₪</td>
                      <td className="py-3 px-4 text-right text-blue-600 font-black">{p.prix_detail}₪</td>
                      <td className="py-3 px-4 text-center text-pink-500">
                        {expandedProduct === p.modele ? <ChevronUp className="w-5 h-5 inline" /> : <ChevronDown className="w-5 h-5 inline" />}
                      </td>
                    </tr>
                    {expandedProduct === p.modele && (
                      <tr className="bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 border-b-2 border-pink-200">
                        <td colSpan="12" className="py-8 px-8">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Détails Grossiste */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200">
                              <h4 className="font-black text-pink-600 mb-4 text-lg flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                Prix Grossiste
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Prix NET:</span>
                                  <span className="font-black text-purple-600">${p.prix_net_usd} / {p.prix_net_ils}₪</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Transport:</span>
                                  <span className="font-black text-orange-600">${p.transport_usd} / {p.transport_ils}₪</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Total achat:</span>
                                  <span className="font-black text-gray-800">${p.prix_achat_usd} / {p.prix_achat_ils}₪</span>
                                </div>
                                <div className="h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent my-3"></div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Vente:</span>
                                  <span className="font-black text-pink-600 text-xl">{p.prix_grossiste}₪</span>
                                </div>
                                <div className="bg-pink-100 rounded-xl p-3 border border-pink-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-pink-700 font-bold text-sm">Marge:</span>
                                    <span className="font-black text-pink-600">{p.marge_grossiste_ils}₪ ({p.marge_grossiste_pct}%)</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Détails Club */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
                              <h4 className="font-black text-purple-600 mb-4 text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Prix Club
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Prix NET:</span>
                                  <span className="font-black text-purple-600">${p.prix_net_usd} / {p.prix_net_ils}₪</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Transport:</span>
                                  <span className="font-black text-orange-600">${p.transport_usd} / {p.transport_ils}₪</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Total achat:</span>
                                  <span className="font-black text-gray-800">${p.prix_achat_usd} / {p.prix_achat_ils}₪</span>
                                </div>
                                <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent my-3"></div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Vente:</span>
                                  <span className="font-black text-purple-600 text-xl">{p.prix_club}₪</span>
                                </div>
                                <div className="bg-purple-100 rounded-xl p-3 border border-purple-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-purple-700 font-bold text-sm">Marge:</span>
                                    <span className="font-black text-purple-600">{p.marge_club_ils}₪ ({p.marge_club_pct}%)</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Détails Détail */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                              <h4 className="font-black text-blue-600 mb-4 text-lg flex items-center gap-2">
                                <Store className="w-5 h-5" />
                                Prix Détail
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Prix NET:</span>
                                  <span className="font-black text-purple-600">${p.prix_net_usd} / {p.prix_net_ils}₪</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Transport:</span>
                                  <span className="font-black text-orange-600">${p.transport_usd} / {p.transport_ils}₪</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Total achat:</span>
                                  <span className="font-black text-gray-800">${p.prix_achat_usd} / {p.prix_achat_ils}₪</span>
                                </div>
                                <div className="h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent my-3"></div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-bold text-sm">Vente:</span>
                                  <span className="font-black text-blue-600 text-xl">{p.prix_detail}₪</span>
                                </div>
                                <div className="bg-blue-100 rounded-xl p-3 border border-blue-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-blue-700 font-bold text-sm">Marge:</span>
                                    <span className="font-black text-blue-600">{p.marge_detail_ils}₪ ({p.marge_detail_pct}%)</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                            <h4 className="font-black text-gray-800 mb-3 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-pink-500" />
                              Tailles disponibles
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(p.tailles || {}).map(([t, dispo]) => (
                                dispo && <span key={t} className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-xl text-sm font-black border-2 border-pink-200">{t}</span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-8 py-4 bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition font-black shadow-lg"
          >
            ← Précédent
          </button>
          <span className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-xl text-xl">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-8 py-4 bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition font-black shadow-lg"
          >
            Suivant →
          </button>
        </div>

      </div>
    </div>
  );
};

export default CatalogApp;