import React, { useState, useEffect } from 'react';

// Medalha/ícone com mesma largura SEMPRE
const renderPosicao = (idx) => {
  const style = { 
    width: 52, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  };
  
  if (idx === 0) return <div style={style}>🥇</div>;
  if (idx === 1) return <div style={style}>🥈</div>;
  if (idx === 2) return <div style={style}>🥉</div>;
  
  return <div style={{ 
    ...style, 
    fontWeight: 900, 
    color: "#0583ea", 
    fontSize: 28 
  }}>{idx + 1}</div>;
};

// Função para formatar valores monetários corretamente
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

const styles = {
  page: {
    background: 'linear-gradient(135deg, #0d0f17 0%, #141a28 100%)',
    minHeight: '100vh',
    width: '100%',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  logo: {
    width: 150,
    margin: '32px auto',
    display: 'block',
    zIndex: 10,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 940,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 20px 40px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    alignItems: 'center',
    width: '100%',
    maxWidth: 900,
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '52px 90px 1fr 210px',
    alignItems: 'center',
    background: 'rgba(30, 35, 50, 0.8)',
    borderRadius: '18px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    padding: '14px 0',
    minHeight: '110px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontFamily: 'Poppins, Arial, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all .3s ease',
  },
  podiumItem: {
    background: 'linear-gradient(90deg, #2a2a2a 0%, #ffd600 100%)',
    border: '3px solid #ffd600',
    boxShadow: '0 4px 32px rgba(255, 214, 0, 0.3), 0 1.5px 7px rgba(0,0,0,0.1)',
    minHeight: 128,
    zIndex: 2,
  },
  podium2: {
    background: 'linear-gradient(90deg, #2a2a2a 0%, #e1e4e7 100%)',
    border: '3px solid #bbb',
    boxShadow: '0 4px 32px rgba(187, 187, 187, 0.3), 0 1.5px 7px rgba(0,0,0,0.1)',
  },
  podium3: {
    background: 'linear-gradient(90deg, #2a2a2a 0%, #e7c09d 100%)',
    border: '3px solid #cd7f32',
    boxShadow: '0 4px 32px rgba(205, 127, 50, 0.3), 0 1.5px 7px rgba(0,0,0,0.1)',
  },
  // Novo estilo para todos os itens do top 5
  top5Item: {
    background: 'linear-gradient(90deg, #2a2a2a 0%, #0583ea 100%)',
    border: '3px solid #0583ea',
    boxShadow: '0 4px 32px rgba(5, 131, 234, 0.3), 0 1.5px 7px rgba(0,0,0,0.1)',
    minHeight: 128,
    zIndex: 1,
  },
  photo: {
    width: '74px',
    height: '74px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid #0583ea',
    background: '#2a3a5a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    flexShrink: 0,
  },
  podiumPhoto: {
    border: '3px solid #ffd600',
    boxShadow: '0 0 10px rgba(255, 214, 0, 0.3)',
  },
  podiumPhoto2: {
    border: '3px solid #bbb',
    boxShadow: '0 0 10px rgba(187, 187, 187, 0.3)',
  },
  podiumPhoto3: {
    border: '3px solid #cd7f32',
    boxShadow: '0 0 10px rgba(205, 127, 50, 0.3)',
  },
  top5Photo: {
    border: '3px solid #0583ea',
    boxShadow: '0 0 10px rgba(5, 131, 234, 0.3)',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
    background: '#fff',
    display: 'block',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
    wordBreak: 'break-word',
    paddingLeft: 12,
    paddingRight: 12,
  },
  nome: {
    fontWeight: 900,
    fontSize: '1.23rem',
    color: '#ffffff',
    marginBottom: 3,
    lineHeight: 1.1,
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
  },
  // NOME DA EQUIPE EM NEGRITO E BRANCO
  equipe: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '1.0rem',
    lineHeight: 1.07,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  // COR DOS VALORES AJUSTADA PARA VERDE ESCURO DE ALTO CONTRASTE
  valor: {
    color: '#2ECC71', // Verde mais escuro e vibrante
    fontWeight: 900,
    fontSize: '1.5rem',
    textAlign: 'right',
    lineHeight: 1.13,
    whiteSpace: 'nowrap',
    paddingRight: 12,
    display: 'block',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  loadingText: {
    fontSize: 22,
    color: "#aaa",
    textAlign: 'center'
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    padding: '0 20px',
  },
  subtitle: {
    fontSize: '1.8rem',
    color: '#ffffff',
    marginBottom: 30,
    fontWeight: 600,
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  }
};

const userDefault = "/user-default.png";

const RankingList = ({ data }) => (
  <div style={styles.list}>
    {data.slice(0, 5).map((vendedor, idx) => {
      // Aplicar estilo do pódio para os 3 primeiros
      // e estilo top5 para os demais
      let itemStyle = { ...styles.item, ...styles.top5Item };
      let photoStyle = { ...styles.photo, ...styles.top5Photo };
      
      if (idx === 0) {
        itemStyle = { ...itemStyle, ...styles.podiumItem };
        photoStyle = { ...photoStyle, ...styles.podiumPhoto };
      } else if (idx === 1) {
        itemStyle = { ...itemStyle, ...styles.podium2 };
        photoStyle = { ...photoStyle, ...styles.podiumPhoto2 };
      } else if (idx === 2) {
        itemStyle = { ...itemStyle, ...styles.podium3 };
        photoStyle = { ...photoStyle, ...styles.podiumPhoto3 };
      }
      
      return (
        <div
          key={vendedor.vendedor_id || vendedor.usuario_id || vendedor.id || idx}
          style={itemStyle}
        >
          {renderPosicao(idx)}
          <div style={photoStyle}>
            <img
              src={vendedor.foto && vendedor.foto.trim() !== "" ? vendedor.foto : userDefault}
              alt={vendedor.nome}
              style={styles.img}
              onError={(e) => {
                e.target.src = userDefault;
              }}
            />
          </div>
          <div style={styles.infoCol}>
            <span style={styles.nome}>{vendedor.nome}</span>
            <span style={styles.equipe}><b>Equipe:</b> {vendedor.equipe}</span>
          </div>
          <span style={styles.valor}>
            <b>{formatCurrency(vendedor.valorVendido)}</b>
          </span>
        </div>
      );
    })}
  </div>
);

const Ranking = () => {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // URL corrigida para a API do backend
        const res = await fetch("http://26.51.147.22:3500/api/ranking?empresa=VIEIRACRED");
        
        if (!res.ok) {
          throw new Error(`Erro HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Se a resposta for um objeto com propriedade ranking (como no exemplo anterior)
        const rankingArray = Array.isArray(data) ? data : 
                            (Array.isArray(data.ranking) ? data.ranking : []);
        
        // Garante que os valores sejam números
        const formattedData = rankingArray.map(item => ({
          ...item,
          valorVendido: typeof item.valorVendido === 'string'
            ? parseFloat(
                item.valorVendido
                  .replace('R$', '')
                  .replace(/\./g, '')
                  .replace(',', '.')
              ) || 0
            : (item.valorVendido || 0)
        }));
        
        // Ordenar por valor vendido (do maior para o menor)
        formattedData.sort((a, b) => b.valorVendido - a.valorVendido);
        
        setRankingData(formattedData);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao buscar ranking:", err);
        setError(err.message);
        setRankingData([]);
        setLoading(false);
      }
    };

    fetchData();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.page}>
      <img src="/vieiracred-branco.png" alt="Vieiracred" style={styles.logo} />
      
      <div style={styles.contentContainer}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <span style={styles.loadingText}>Carregando ranking...</span>
          </div>
        ) : error ? (
          <div style={styles.loadingContainer}>
            <span style={styles.loadingText}>Erro: {error}</span>
          </div>
        ) : rankingData.length > 0 ? (
          <RankingList data={rankingData} />
        ) : (
          <div style={styles.loadingContainer}>
            <span style={styles.loadingText}>Nenhum dado disponível</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ranking;