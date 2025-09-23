// server.js - Backend Otimizado com Melhor Performance
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const app = express();
const PORT = process.env.PORT || 3500;
const BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// Configurações de performance
const ARGUS_TIMEOUT = parseInt(process.env.ARGUS_TIMEOUT) || 5000; // 5 segundos
const ARGUS_CONCURRENCY = parseInt(process.env.ARGUS_CONCURRENCY) || 10; // 10 requisições simultâneas
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 15000; // 15 segundos de cache

// Configuração do Banco de Dados Local
const localDbConfig = {
  server: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Configuração do Banco de Dados na Nuvem
const cloudDbConfig = {
  server: process.env.DB_CLOUD_HOST,
  database: process.env.DB_CLOUD_DATABASE,
  user: process.env.DB_CLOUD_USER,
  password: process.env.DB_CLOUD_PASSWORD,
  port: parseInt(process.env.DB_CLOUD_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Middlewares
app.use(cors());
app.use(express.json());

// Variáveis para armazenar o estado das conexões
let isLocalConnected = false;
let isCloudConnected = false;

// Cache para dados dos operadores
let operadoresCache = {
  data: null,
  timestamp: 0,
  isFetching: false,
  fetchPromise: null
};

// Função para testar a conexão com o banco local
async function testLocalConnection() {
  try {
    const pool = await sql.connect(localDbConfig);
    isLocalConnected = true;
    
    console.log('✅ CONEXÃO BEM-SUCEDIDA com o Banco Local!');
    
    await pool.close();
    return true;
  } catch (error) {
    isLocalConnected = false;
    console.error('❌ ERRO na conexão com o Banco Local:', error.message);
    return false;
  }
}

// Função para testar a conexão com o banco na nuvem
async function testCloudConnection() {
  try {
    const pool = await sql.connect(cloudDbConfig);
    isCloudConnected = true;
    
    console.log('✅ CONEXÃO BEM-SUCEDIDA com o Banco na Nuvem!');
    
    await pool.close();
    return true;
  } catch (error) {
    isCloudConnected = false;
    console.error('❌ ERRO na conexão com o Banco na Nuvem:', error.message);
    return false;
  }
}

// Função para validar URL de imagem
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Verificar se é "false", "null" ou vazio
  if (url.toLowerCase() === 'false' || 
      url.toLowerCase() === 'null' || 
      url.trim() === '') {
    return false;
  }
  
  // Verificar se parece ser uma URL válida
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Função para buscar imagem de perfil do vendedor
async function buscarImagemPerfil(vendedorId) {
  try {
    console.log(`🖼️ Buscando imagem de perfil para vendedor: ${vendedorId}`);
    const localPool = await sql.connect(localDbConfig);
    
    // Query para buscar a imagem de perfil na tabela operadores_new
    const imagemQuery = `
      SELECT image_perfil
      FROM operadores_new
      WHERE usuario_id = @vendedorId
    `;
    
    const imagemRequest = localPool.request();
    imagemRequest.input('vendedorId', sql.VarChar, vendedorId);
    
    const imagemResult = await imagemRequest.query(imagemQuery);
    await localPool.close();
    
    if (imagemResult.recordset.length > 0) {
      const imagePerfil = imagemResult.recordset[0].image_perfil;
      
      // Verificar se a imagem é uma URL válida
      if (isValidImageUrl(imagePerfil)) {
        console.log(`✅ Imagem válida encontrada para vendedor ${vendedorId}`);
        return imagePerfil;
      } else {
        console.log(`ℹ️ Imagem não disponível ou inválida para vendedor ${vendedorId}, usando padrão`);
        return '/LOGO-vieira.jpeg';
      }
    } else {
      console.log(`ℹ️ Nenhum registro encontrado para vendedor ${vendedorId}, usando padrão`);
      return '/LOGO-vieira.jpeg';
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar imagem para vendedor ${vendedorId}:`, error.message);
    return '/LOGO-vieira.jpeg';
  }
}

// Função para processar requisições em lote com limite de concorrência
async function processBatch(items, processFn, concurrency = 5) {
  const results = [];
  const batches = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(item => 
      processFn(item).catch(error => {
        console.error(`❌ Erro no processamento do item:`, error.message);
        return null;
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
    
    // Pequena pausa entre batches para não sobrecarregar a API
    if (batches.length > 1) {
      await sleep(100);
    }
  }
  
  return results;
}

// Rota para obter status dos operadores do Argus - VERSÃO OTIMIZADA
app.get('/api/status-operadores', async (req, res) => {
  try {
    // Verificar se temos dados em cache válidos
    const now = Date.now();
    if (operadoresCache.data && (now - operadoresCache.timestamp) < CACHE_DURATION) {
      console.log('✅ Retornando dados do cache');
      return res.json(operadoresCache.data);
    }
    
    // Se já está buscando dados, aguardar a promessa existente
    if (operadoresCache.isFetching) {
      console.log('⏳ Requisição em andamento, aguardando...');
      try {
        const cachedData = await operadoresCache.fetchPromise;
        return res.json(cachedData);
      } catch (error) {
        console.error('❌ Erro ao aguardar requisição existente:', error.message);
        // Continuar com nova requisição
      }
    }
    
    // Iniciar nova busca de dados
    console.log('🔄 Iniciando busca de dados dos operadores...');
    operadoresCache.isFetching = true;
    
    const fetchPromise = (async () => {
      const tokenArgus = process.env.TOKEN_ARGUS;
      if (!tokenArgus) {
        throw new Error('Token da API Argus não configurado');
      }

      // Conectar ao banco local e buscar os colaboradores da VIEIRACRED
      console.log('🔌 Conectando ao banco local...');
      const localPool = await sql.connect(localDbConfig);
      
      // Query ajustada para buscar também o tipo de contrato, Nome_Front e equipe
      const query = `
        SELECT id_argus, Nome as nome, tipo_contratacao, Nome_Front, equipe
        FROM colaboradores 
        WHERE empresa = 'VIEIRACRED' 
        AND cargo = 'Operador de Vendas'
        AND id_argus IS NOT NULL 
        AND id_argus != ''
      `;
      
      console.log('📋 Buscando colaboradores...');
      const result = await localPool.request().query(query);
      await localPool.close();
      
      console.log(`✅ ${result.recordset.length} colaboradores encontrados`);
      
      // Se não houver colaboradores, retornar array vazio
      if (result.recordset.length === 0) {
        return {
          operadores: [],
          logados: 0,
          meta: 0,
          horario_atual: Date.now(),
          logados_total: 0,
          meta_total: 0,
          logados_clt: 0,
          meta_clt: 0,
          logados_estagio: 0,
          meta_estagio: 0,
          filtro: "CLT+Estágio"
        };
      }

      const ramais = result.recordset.map(row => ({
        ramal: row.id_argus,
        nome: row.nome,
        tipo: row.tipo_contratacao || 'CLT',
        nomeFront: row.Nome_Front,
        equipe: row.equipe
      }));

      // Processar requisições para a API Argus em paralelo com limite de concorrência
      console.log('🌐 Buscando status dos operadores na API Argus...');
      const startTime = Date.now();
      
      const processRamal = async (item) => {
        try {
          const response = await axios.get(`https://argus.app.br/apiargus/cmd/statusoperador?ramal=${item.ramal}`, {
            headers: {
              'Token-Signature': tokenArgus
            },
            timeout: ARGUS_TIMEOUT
          });

          if (response.data.codStatus !== 1) {
            console.error(`❌ Erro na API Argus para ramal ${item.ramal}: ${response.data.descStatus}`);
            return null;
          }

          const statusOperador = response.data.statusOperador;
          const tempoStatusSegundos = Math.floor(statusOperador.tempoStatus / 1000);
          
          return {
            nome: item.nomeFront || item.nome,
            ramal: statusOperador.ramal || item.ramal,
            descricaoStatus: statusOperador.descricaoStatus || 'Status desconhecido',
            tempoStatus: tempoStatusSegundos,
            equipe: item.equipe || 'Não informado',
            nomeFront: item.nomeFront || item.nome,
            equipeFront: item.equipe || 'Não informado',
            grupo: statusOperador.grupo || 'Não informado',
            tipo: item.tipo
          };
        } catch (error) {
          console.error(`❌ Erro na requisição para o ramal ${item.ramal}:`, error.message);
          return null;
        }
      };

      const operadores = await processBatch(ramais, processRamal, ARGUS_CONCURRENCY);
      
      const endTime = Date.now();
      console.log(`✅ Status de ${operadores.length} operadores obtidos em ${endTime - startTime}ms`);

      // Calcular estatísticas
      let logados = 0;
      let logados_clt = 0;
      let logados_estagio = 0;

      operadores.forEach(operador => {
        if (!operador) return;
        
        const statusLower = (operador.descricaoStatus || '').toLowerCase();
        if (!statusLower.includes('pausa') && !statusLower.includes('deslogado')) {
          logados++;
          if (operador.tipo && operador.tipo.toUpperCase() === 'CLT') {
            logados_clt++;
          } else if (operador.tipo && (operador.tipo.toUpperCase() === 'ESTÁGIO' || operador.tipo.toUpperCase() === 'ESTAGIO')) {
            logados_estagio++;
          }
        }
      });

      // Calcular metas
      const total_colaboradores = ramais.length;
      const meta_total = total_colaboradores;
      const meta_clt = ramais.filter(r => r.tipo && r.tipo.toUpperCase() === 'CLT').length;
      const meta_estagio = ramais.filter(r => r.tipo && (r.tipo.toUpperCase() === 'ESTÁGIO' || r.tipo.toUpperCase() === 'ESTAGIO')).length;

      const responseData = {
        operadores,
        logados, 
        meta: meta_total, 
        horario_atual: Date.now(),
        logados_total: operadores.length,
        meta_total,
        logados_clt,
        meta_clt,
        logados_estagio,
        meta_estagio,
        filtro: "CLT+Estágio"
      };

      // Atualizar cache
      operadoresCache.data = responseData;
      operadoresCache.timestamp = Date.now();
      
      console.log('✅ Dados de status dos operadores preparados:', {
        total_operadores: operadores.length,
        logados,
        logados_clt,
        logados_estagio
      });

      return responseData;
    })();
    
    // Armazenar a promessa para outras requisições aguardarem
    operadoresCache.fetchPromise = fetchPromise;
    
    // Aguardar e retornar os dados
    const result = await fetchPromise;
    operadoresCache.isFetching = false;
    
    res.json(result);
  } catch (error) {
    operadoresCache.isFetching = false;
    console.error('❌ Erro geral em /api/status-operadores:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      operadores: []
    });
  }
});

// Rota principal para obter o ranking de vendedores com filtro por empresa
app.get('/api/ranking', async (req, res) => {
  console.log('📊 Recebida solicitação para /api/ranking');
  
  // Obter o parâmetro de empresa da query string
  const { empresa } = req.query;
  
  if (!empresa) {
    console.log('❌ Parâmetro "empresa" não fornecido na query string');
    return res.status(400).json({ 
      error: 'Parâmetro "empresa" é obrigatório',
      message: 'Use /api/ranking?empresa=nome_da_empresa'
    });
  }
  
  console.log(`🏢 Filtrando por empresa: ${empresa}`);
  
  try {
    // Primeiro, buscar os vendedores da empresa específica no banco local
    console.log('🔌 Conectando ao banco local...');
    const localPool = await sql.connect(localDbConfig);
    console.log('✅ Conexão com o banco local estabelecida');
    
    // Query para obter vendedores da empresa específica (usando Nome em vez de nome)
    const vendedoresQuery = `
      SELECT id_new, Nome_Front as nome, equipe
      FROM colaboradores
      WHERE empresa = @empresa
    `;
    
    console.log('📋 Buscando vendedores da empresa:', empresa);
    const vendedoresRequest = localPool.request();
    vendedoresRequest.input('empresa', sql.VarChar, empresa);
    
    const vendedoresResult = await vendedoresRequest.query(vendedoresQuery);
    console.log(`✅ ${vendedoresResult.recordset.length} vendedores encontrados para a empresa ${empresa}`);
    
    await localPool.close();
    
    // Se não houver vendedores para a empresa, retornar array vazio
    if (vendedoresResult.recordset.length === 0) {
      console.log('📭 Nenhum vendedor encontrado para esta empresa');
      return res.json([]);
    }
    
    // Extrair IDs dos vendedores para buscar vendas no banco na nuvem
    const vendedorIds = vendedoresResult.recordset.map(item => item.id_new);
    
    // Criar um mapa de vendedores para fácil acesso
    const vendedoresMap = {};
    vendedoresResult.recordset.forEach(vendedor => {
      vendedoresMap[vendedor.id_new] = {
        nome: vendedor.nome,
        equipe: vendedor.equipe
      };
    });
    
    // Agora, buscar vendas desses vendedores no banco na nuvem
    console.log('🔌 Conectando ao banco na nuvem...');
    const cloudPool = await sql.connect(cloudDbConfig);
    console.log('✅ Conexão con o banco na nuvem estabelecida');
    
    // Query para obter vendas dos vendedores específicos
    const salesQuery = `
      SELECT
        vendedor_id as id,
        SUM(valor_referencia) as valorVendido
      FROM cadastrados
      WHERE 
        vendedor_id IN (${vendedorIds.map(id => `'${id}'`).join(',')})
        AND CAST(data_cadastro AS DATE) = CAST(GETDATE() AS DATE)
      GROUP BY vendedor_id
      ORDER BY valorVendido DESC
    `;
    
    console.log('📋 Buscando vendas dos vendedores...');
    const salesResult = await cloudPool.request().query(salesQuery);
    console.log(`✅ ${salesResult.recordset.length} vendedores com vendas encontrados`);
    
    await cloudPool.close();
    
    // Combinar os dados de vendas com as informações dos vendedores
    // E buscar as imagens de perfil para cada vendedor
    const rankingData = [];
    
    for (const item of salesResult.recordset) {
      const vendedorInfo = vendedoresMap[item.id] || {
        nome: 'Vendedor Não Encontrado',
        equipe: 'N/A'
      };
      
      // Buscar a imagem de perfil para este vendedor
      const foto = await buscarImagemPerfil(item.id);
      
      rankingData.push({
        id: item.id,
        nome: vendedorInfo.nome,
        foto: foto,
        equipe: vendedorInfo.equipe,
        valorVendido: parseFloat(item.valorVendido) || 0
      });
    }
    
    console.log('📦 Dados combinados para envio:', rankingData);
    
    res.json(rankingData);
    console.log('✅ Resposta enviada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao buscar ranking:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Rota alternativa para listar todas as empresas disponíveis
app.get('/api/empresas', async (req, res) => {
  console.log('🏢 Recebida solicitação para /api/empresas');
  
  try {
    console.log('🔌 Conectando ao banco local...');
    const localPool = await sql.connect(localDbConfig);
    console.log('✅ Conexão com o banco local estabelecida');
    
    // Query para obter todas as empresas distintas
    const empresasQuery = `
      SELECT DISTINCT empresa
      FROM colaboradores
      WHERE empresa IS NOT NULL AND empresa != ''
      ORDER BY empresa
    `;
    
    console.log('📋 Buscando empresas...');
    const empresasResult = await localPool.request().query(empresasQuery);
    console.log(`✅ ${empresasResult.recordset.length} empresas encontradas`);
    
    await localPool.close();
    
    // Extrair apenas os nomes das empresas
    const empresas = empresasResult.recordset.map(item => item.empresa);
    
    res.json(empresas);
    console.log('✅ Lista de empresas enviada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao buscar empresas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  console.log('❤️ Recebida solicitação de health check');
  res.json({ 
    status: {
      local: isLocalConnected ? 'Conectado' : 'Desconectado',
      cloud: isCloudConnected ? 'Conectado' : 'Desconectado'
    },
    databases: {
      local: localDbConfig.database,
      cloud: cloudDbConfig.database
    },
    servers: {
      local: localDbConfig.server,
      cloud: cloudDbConfig.server
    },
    timestamp: new Date().toISOString()
  });
});

// Rota para forçar teste de conexão
app.get('/test-connection', async (req, res) => {
  console.log('🔌 Recebida solicitação para testar conexão');
  const localResult = await testLocalConnection();
  const cloudResult = await testCloudConnection();
  
  res.json({ 
    success: localResult && cloudResult,
    local: {
      success: localResult,
      message: localResult ? 'Conexão bem-sucedida' : 'Falha na conexão'
    },
    cloud: {
      success: cloudResult,
      message: cloudResult ? 'Conexão bem-sucedida' : 'Falha na conexão'
    }
  });
});

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  console.log('❌ Rota não encontrada:', req.originalUrl);
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Ocorreu um erro inesperado'
  });
});

// Iniciar servidor e testar conexões
app.listen(PORT, async () => {
  console.log(`🚀 Servidor iniciado na porta ${PORT}`);
  console.log('🔌 Testando conexões com os bancos de dados...');
  
  // Testar conexões imediatamente ao iniciar
  await testLocalConnection();
  await testCloudConnection();
  
  // Agendar teste periódico a cada 5 minutos
  setInterval(async () => {
    await testLocalConnection();
    await testCloudConnection();
  }, 5 * 60 * 1000);
  
  console.log(`❤️ Health check disponível em: http://ubuntu.sistemavieira.com.br:${PORT}/health`);
  console.log(`🔌 Teste de conexão disponível em: http://ubuntu.sistemavieira.com.br:${PORT}/test-connection`);
  console.log(`📊 API Ranking disponível em: http://ubuntu.sistemavieira.com.br:${PORT}/api/ranking?empresa=VIEIRACRED`);
  console.log(`📈 API Status Operadores disponível em: http://ubuntu.sistemavieira.com.br:${PORT}/api/status-operadores`);
  console.log(`🏢 Lista de empresas disponível em: http://ubuntu.sistemavieira.com.br:${PORT}/api/empresas`);
});

// Gerenciar encerramento graceful
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  await sql.close();
  process.exit(0);
});


