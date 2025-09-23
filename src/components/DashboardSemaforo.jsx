import React, { useEffect, useState } from "react";
import { apiUrl } from "../utils/api";
import { FiPhone, FiPause, FiCheck, FiUsers, FiZap, FiCheckCircle } from "react-icons/fi";

const STATUS_CONFIG = [
  {
    label: "Em Atendimento",
    match: (txt) => txt.includes("atendimento"),
    color: "bg-red-500",
    icon: <FiPhone className="text-white text-2xl" />,
  },
  {
    label: "Em Pausa",
    match: (txt) => txt.includes("pausa"),
    color: "bg-yellow-400",
    icon: <FiPause className="text-white text-2xl" />,
  },
  {
    label: "Livre",
    match: (txt) => txt.includes("livre"),
    color: "bg-green-500",
    icon: <FiCheck className="text-white text-2xl" />,
  },
];

function tempoFormatado(segundos) {
  segundos = Number(segundos) || 0;
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}m${s.toString().padStart(2, "0")}s`;
  if (m > 0) return `${m}m${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export default function DashboardSemaforo() {
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dadosStatus, setDadosStatus] = useState({
    logados: 0,
    meta: 0,
    horario_atual: 0,
    logados_total: 0,
    meta_total: 0,
    logados_clt: 0,
    meta_clt: 0,
    logados_estagio: 0,
    meta_estagio: 0,
    filtro: "CLT+Estágio"
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl("/api/status-operadores"));
        const data = await res.json();
        
        setOperadores(Array.isArray(data.operadores) ? data.operadores : []);
        
        setDadosStatus({
          logados: data.logados,
          meta: data.meta,
          horario_atual: data.horario_atual,
          logados_total: data.logados_total,
          meta_total: data.meta_total,
          logados_clt: data.logados_clt,
          meta_clt: data.meta_clt,
          logados_estagio: data.logados_estagio,
          meta_estagio: data.meta_estagio,
          filtro: data.filtro
        });
        
      } catch (err) {
        console.error("Erro ao buscar operadores:", err);
        setOperadores([]);
      }
      setLoading(false);
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-lg font-bold">Carregando operadores...</div>
    );
  }

  const { 
    logados, 
    meta, 
    horario_atual,
    logados_total, 
    meta_total, 
    logados_clt, 
    meta_clt, 
    logados_estagio, 
    meta_estagio, 
    filtro 
  } = dadosStatus;

  const percent = meta ? Math.round((logados / meta) * 100) : 0;

  let linhasLogados = ["bg-gray-50", "bg-gray-50", "bg-gray-50", "bg-gray-50"];
  if (percent <= 24) {
    linhasLogados = ["bg-gray-50", "bg-gray-50", "bg-gray-50", "bg-gray-50"];
  } else if (percent >= 25 && percent <= 49) {
    linhasLogados = ["bg-gray-50", "bg-gray-50", "bg-gray-50", "bg-green-400"];
  } else if (percent >= 50 && percent <= 74) {
    linhasLogados = ["bg-gray-50", "bg-gray-50", "bg-green-400", "bg-green-400"];
  } else if (percent >= 75 && percent < 99) {
    linhasLogados = ["bg-gray-50", "bg-green-400", "bg-green-400", "bg-green-400"];
  } else if (percent === 100) {
    linhasLogados = ["bg-green-400", "bg-green-400", "bg-green-400", "bg-green-400"];
  }

  function getPositionColor(statusLabel) {
    switch (statusLabel) {
      case "Em Atendimento":
        return "text-red-500";
      case "Em Pausa":
        return "text-yellow-400";
      case "Livre":
        return "text-green-500";
      default:
        return "text-green-400";
    }
  }

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center py-12 px-2">
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-7">
        {STATUS_CONFIG.map((statusConf) => {
          const opsAll = operadores
            .filter((op) => {
              const txt = (op.descricaoStatus || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              return statusConf.match(txt);
            })
            .sort((a, b) => (b.tempoStatus || 0) - (a.tempoStatus || 0));
          
          const opsTop10 = opsAll.slice(0, 10);
          const avg = opsAll.length > 0
            ? tempoFormatado(
                Math.round(
                  opsAll.reduce((s, op) => s + Number(op.tempoStatus || 0), 0) / opsAll.length
                )
              )
            : "0s";
          
          const percentStatus = logados_total > 0 
            ? Math.round((opsAll.length / logados_total) * 100) 
            : 0;

          return (
            <div
              key={statusConf.label}
              className={`${statusConf.color} rounded-2xl shadow-lg pb-6 flex flex-col items-center relative overflow-visible`}
              style={{ marginTop: "44px" }}
            >
              <div className={`w-full flex flex-col items-center ${statusConf.color} pt-14 pb-1 rounded-t-2xl relative z-10`}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                  <div className={`rounded-full w-16 h-16 flex items-center justify-center shadow-lg ${statusConf.color} border-4 border-white`}>
                    {statusConf.icon}
                  </div>
                </div>
                <span className="text-2xl font-extrabold text-white mb-0 tracking-wide">{statusConf.label}</span>
                <span className="text-5xl font-extrabold text-white leading-tight my-2 drop-shadow">
                  {opsAll.length}
                  <span className="ml-1 font-extrabold text-5xl text-white drop-shadow">
                    ({percentStatus}%)
                  </span>
                </span>
                <span className="text-base font-semibold text-white drop-shadow mb-2">Média: {avg}</span>
              </div>
              
              <div className="w-full flex-1 flex flex-col overflow-hidden bg-white p-0 rounded-b-2xl px-5 mt-6">
                {opsTop10.map((item, i) => (
                  <div
                    key={item.ramal + i}
                    className="flex items-center border-b last:border-b-0 py-2"
                  >
                    <span className={`font-bold w-8 text-right mr-2 ${getPositionColor(statusConf.label)}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold">{item.nomeFront || item.nome}</div>
                      <div className="text-xs font-bold text-gray-500">
                        {item.equipe || item.equipeFront || item.grupo || ""}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-600">
                      {tempoFormatado(item.tempoStatus)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className={`${statusConf.color} h-6 w-full rounded-b-2xl`} />
            </div>
          );
        })}

        <div
          className={`
            rounded-2xl shadow-lg pb-6 flex flex-col items-center relative overflow-visible
            ${percent <= 24 ? "border-4 border-red-400 animate-glow-border" : ""}
            ${percent === 100 ? "border-4 border-green-400 shadow-green-200 animate-glow" : ""}
          `}
          style={{ marginTop: "44px", background: "#066eea" }}
        >
          <div className="w-full flex flex-col items-center pt-14 pb-4 rounded-t-2xl relative z-10" style={{ background: "#066eea" }}>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <div
                className="rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-4 border-white"
                style={{ background: "#066eea" }}
              >
                <FiUsers className="text-white text-2xl" />
              </div>
            </div>
            <span className="text-2xl font-extrabold text-white mb-0 tracking-wide">Logados</span>
            <span className="text-5xl font-extrabold text-white leading-tight my-2 drop-shadow">
              {percent}%
            </span>
            <span className="text-base font-semibold text-white drop-shadow mb-1">
              Operadores: {logados}/{meta} ({filtro})
            </span>
          </div>
          
          <div className="w-full flex-1 flex flex-col overflow-hidden p-0 rounded-b-2xl" style={{ background: "#066eea" }}>
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`
                  flex-1 flex items-center justify-center w-full relative overflow-hidden
                  ${idx < 3 ? "border-b border-gray-200" : "rounded-b-2xl"}
                  ${percent === 100 ? "shadow-lg shadow-green-400/40" : ""}
                  ${percent > 24 ? linhasLogados[idx] : ""}
                `}
                style={{
                  minHeight: "60px",
                  background: percent <= 24 ? "rgb(249 250 251)" : undefined,
                }}
              >
                {percent <= 24 && idx === 1 && (
                  <FiZap className="text-yellow-400 text-7xl animate-bounce z-10" />
                )}
                {percent <= 24 && idx === 2 && (
                  <span className="text-red-600 font-bold text-3xl text-center animate-pulse w-full">
                    Atenção: Nível crítico de logados!
                  </span>
                )}
                {percent === 100 && idx === 1 && (
                  <FiCheckCircle style={{ color: '#fff', textShadow: '0 0 3px #fff, 0 0 8px #fff' }} className="text-7xl animate-bounce z-10" />
                )}
                {percent === 100 && idx === 2 && (
                  <span
                    style={{
                      color: '#fff',
                      textShadow: '0 0 3px #fff, 0 0 8px #fff'
                    }}
                    className="font-bold text-3xl text-center w-full"
                  >
                    Energia máxima para bater a meta!
                  </span>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ background: "#066eea" }} className="h-6 w-full rounded-b-2xl" />
          
          <style>
            {`
              @keyframes borderPulseRed {
                0% { box-shadow: 0 0 0 0 #ff2828cc; }
                50% { box-shadow: 0 0 0 4px #ff2828aa; }
                100% { box-shadow: 0 0 0 0 #ff2828cc; }
              }
              .animate-glow-border {
                animation: borderPulseRed 1s infinite;
              }
              @keyframes greenGlow {
                0% { box-shadow: 0 0 0px #39FF1444, 0 0 0px #39FF1488; }
                50% { box-shadow: 0 0 16px #39FF1466, 0 0 32px #39FF14cc; }
                100% { box-shadow: 0 0 0px #39FF1444, 0 0 0px #39FF1488; }
              }
              .animate-glow {
                animation: greenGlow 2s infinite;
              }
            `}
          </style>
        </div>
      </div>
    </div>
  );
}
