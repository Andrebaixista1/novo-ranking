import React, { useEffect, useState, useCallback } from "react";
import DashboardSemaforo from "./DashboardSemaforo";
import DashboardRanking from "./DashboardRanking";

const TEMPO_SEMAFORO = 30 * 1000;    // 30 segundos
const TEMPO_RANKING = 30 * 1000;     // 30 segundos

export default function PainelRotativo() {
  const [painelAtivo, setPainelAtivo] = useState(0); // 0 = semáforo, 1 = ranking
  const [rankingData, setRankingData] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Função para buscar dados do ranking
  const fetchRanking = useCallback(async () => {
    try {
      const res = await fetch("http://26.51.147.22:3500/api/ranking?empresa=VIEIRACRED");
      
      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`);
      }
      
      const data = await res.json();
      setRankingData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar ranking:", err);
    }
  }, []);

  // Controle da rotação de painéis
  useEffect(() => {
    const timer = setInterval(() => {
      setPainelAtivo(prev => (prev === 0 ? 1 : 0));
    }, painelAtivo === 0 ? TEMPO_SEMAFORO : TEMPO_RANKING);

    return () => clearInterval(timer);
  }, [painelAtivo]);

  // Busca inicial e configuração de intervalo para atualização
  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, [fetchRanking]);

  // Funções para controle de tela cheia
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Monitorar mudanças de tela cheia
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="relative w-full min-h-screen">
      {/* Botão de tela cheia */}
      <button 
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-md"
        title={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
      >
        {isFullscreen ? "⤵️" : "⤴️"}
      </button>

      {/* Painéis */}
      <div className={`${painelAtivo === 0 ? 'block' : 'hidden'}`}>
        <DashboardSemaforo />
      </div>
      
      <div className={`${painelAtivo === 1 ? 'block' : 'hidden'}`}>
        <DashboardRanking rankingData={rankingData} />
      </div>
    </div>
  );
}