import React, { useState, useEffect } from 'react';

const N8NManager = () => {
  const [config, setConfig] = useState({ url: '', apiKey: '' });
  const [isConfigured, setIsConfigured] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [activeTab, setActiveTab] = useState('workflows');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showExecutions, setShowExecutions] = useState(false);

  // Load saved config
  useEffect(() => {
    const saved = sessionStorage.getItem('n8n_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      setIsConfigured(true);
    }
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const baseUrl = config.url.replace(/\/$/, '');
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${baseUrl}/api/v1${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    return response.json();
  };

  const saveConfig = () => {
    if (!config.url || !config.apiKey) {
      setError('Preencha todos os campos');
      return;
    }
    sessionStorage.setItem('n8n_config', JSON.stringify(config));
    setIsConfigured(true);
    setError('');
    loadWorkflows();
  };

  const loadWorkflows = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/workflows');
      setWorkflows(data.data || []);
    } catch (err) {
      setError(`Falha ao carregar: ${err.message}`);
    }
    setLoading(false);
  };

  const loadExecutions = async (workflowId = null) => {
    setLoading(true);
    setError('');
    try {
      const endpoint = workflowId 
        ? `/executions?workflowId=${workflowId}&limit=20`
        : '/executions?limit=30';
      const data = await apiCall(endpoint);
      setExecutions(data.data || []);
    } catch (err) {
      setError(`Falha ao carregar execuções: ${err.message}`);
    }
    setLoading(false);
  };

  const toggleWorkflow = async (workflow) => {
    try {
      const newStatus = !workflow.active;
      await apiCall(`/workflows/${workflow.id}`, 'PATCH', { active: newStatus });
      setWorkflows(prev => prev.map(w => 
        w.id === workflow.id ? { ...w, active: newStatus } : w
      ));
      showToast(`${workflow.name} ${newStatus ? 'ativado' : 'desativado'}`);
    } catch (err) {
      setError(`Erro ao alterar: ${err.message}`);
    }
  };

  const executeWorkflow = async (workflow) => {
    try {
      setLoading(true);
      await apiCall(`/workflows/${workflow.id}/run`, 'POST', {});
      showToast(`${workflow.name} executado!`);
      loadWorkflows();
    } catch (err) {
      setError(`Erro ao executar: ${err.message}`);
    }
    setLoading(false);
  };

  const viewWorkflowExecutions = (workflow) => {
    setSelectedWorkflow(workflow);
    setShowExecutions(true);
    loadExecutions(workflow.id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'bg-emerald-500';
      case 'running': return 'bg-amber-500';
      case 'waiting': return 'bg-blue-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'success': return 'Sucesso';
      case 'running': return 'Executando';
      case 'waiting': return 'Aguardando';
      case 'error': return 'Erro';
      default: return status;
    }
  };

  // Config Screen
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">n8n Manager</h1>
            <p className="text-slate-400 mt-1">Conecte sua instância</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">URL do n8n</label>
                <input
                  type="url"
                  placeholder="https://seu-n8n.com"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                <input
                  type="password"
                  placeholder="n8n_api_..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={saveConfig}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/30"
              >
                Conectar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Executions Detail Modal
  if (showExecutions && selectedWorkflow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <header className="sticky top-0 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 px-4 py-4 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setShowExecutions(false); setSelectedWorkflow(null); }}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white truncate">{selectedWorkflow.name}</h1>
              <p className="text-sm text-slate-400">Execuções</p>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Nenhuma execução encontrada
            </div>
          ) : (
            executions.map((exec) => (
              <div key={exec.id} className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(exec.status)}`}></div>
                    <div>
                      <p className="text-white font-medium">{getStatusLabel(exec.status)}</p>
                      <p className="text-sm text-slate-400">{formatDate(exec.startedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">ID: {exec.id}</p>
                    {exec.stoppedAt && (
                      <p className="text-xs text-slate-400">
                        {Math.round((new Date(exec.stoppedAt) - new Date(exec.startedAt)) / 1000)}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-pulse">
          <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl text-center font-medium shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 px-4 py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">n8n Manager</h1>
          </div>
          <button 
            onClick={() => { setIsConfigured(false); sessionStorage.removeItem('n8n_config'); }}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {activeTab === 'workflows' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Workflows</h2>
              <button 
                onClick={loadWorkflows}
                disabled={loading}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {loading && workflows.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Nenhum workflow encontrado</p>
                <button 
                  onClick={loadWorkflows}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
                >
                  Carregar Workflows
                </button>
              </div>
            ) : (
              workflows.map((workflow) => (
                <div 
                  key={workflow.id} 
                  className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{workflow.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Atualizado: {formatDate(workflow.updatedAt)}
                      </p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggleWorkflow(workflow)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        workflow.active ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        workflow.active ? 'left-6' : 'left-1'
                      }`}></div>
                    </button>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => executeWorkflow(workflow)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Executar
                    </button>
                    <button
                      onClick={() => viewWorkflowExecutions(workflow)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Logs
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'executions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Todas Execuções</h2>
              <button 
                onClick={() => loadExecutions()}
                disabled={loading}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Nenhuma execução encontrada</p>
                <button 
                  onClick={() => loadExecutions()}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
                >
                  Carregar Execuções
                </button>
              </div>
            ) : (
              executions.map((exec) => (
                <div key={exec.id} className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(exec.status)}`}></div>
                      <div>
                        <p className="text-white font-medium truncate max-w-48">
                          {exec.workflowData?.name || `Workflow #${exec.workflowId}`}
                        </p>
                        <p className="text-sm text-slate-400">{formatDate(exec.startedAt)}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      exec.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                      exec.status === 'running' ? 'bg-amber-500/20 text-amber-400' :
                      exec.status === 'waiting' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {getStatusLabel(exec.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700/50">
        <div className="flex">
          <button
            onClick={() => { setActiveTab('workflows'); loadWorkflows(); }}
            className={`flex-1 py-4 flex flex-col items-center gap-1 ${
              activeTab === 'workflows' ? 'text-orange-500' : 'text-slate-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs font-medium">Workflows</span>
          </button>
          <button
            onClick={() => { setActiveTab('executions'); loadExecutions(); }}
            className={`flex-1 py-4 flex flex-col items-center gap-1 ${
              activeTab === 'executions' ? 'text-orange-500' : 'text-slate-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">Execuções</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default N8NManager;
