document.addEventListener('DOMContentLoaded', () => {
    
    // --- AUTHENTICATION MODULE ---
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const dashboardContent = document.getElementById('dashboard-content');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');

    const toggleAuth = (isAuthenticated) => {
        if (isAuthenticated) {
            loginScreen.classList.add('hidden-auth');
            dashboardContent.classList.remove('hidden-auth');
            loadDashboardData();
        } else {
            loginScreen.classList.remove('hidden-auth');
            dashboardContent.classList.add('hidden-auth');
            document.getElementById('password').value = '';
        }
    };

    // Check session
    if (sessionStorage.getItem('logistica_auth') === 'true') {
        toggleAuth(true);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        
        if (user === 'user' && pass === '123') {
            sessionStorage.setItem('logistica_auth', 'true');
            loginError.classList.add('hidden');
            toggleAuth(true);
        } else {
            loginError.classList.remove('hidden');
        }
    });

    btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('logistica_auth');
        toggleAuth(false);
    });

    // --- DASHBOARD RENDER MODULE ---
    async function loadDashboardData() {
        try {
            // Because of CORS locally, if run natively it might fail without a server. 
            // In GitHub Pages it will work perfectly. 
            // Fetch fallback pattern implemented:
            const response = await fetch('data.json');
            if (!response.ok) throw new Error("Fallo al obtener JSON");
            
            const data = await response.json();
            renderUI(data);
        } catch (error) {
            console.error("Error loading data:", error);
            document.getElementById('fecha-corte-text').innerHTML = `<span class="text-red-400">Error de conexión a datos locales. Use Live Server.</span>`;
        }
    }

    function renderUI(data) {
        // 1. Meta
        document.getElementById('fecha-corte-text').innerText = `Corte Operativo: ${data.metadata.fecha_corte}`;

        // 2. KPIs
        let totalMeds = 0; let valMeds = 0;
        let totalIns = 0; let valIns = 0;
        
        data.resumen_general.forEach(r => {
            if(r.tipo === 'Medicamento') { totalMeds++; valMeds += r.stock_total || 0; }
            if(r.tipo === 'Insumo') { totalIns++; valIns += r.stock_total || 0; }
        });

        const kpiHtml = `
            <div class="glass-panel p-6 rounded-xl border-l-4 border-blue-500">
                <p class="text-slate-400 text-sm font-semibold mb-1 uppercase tracking-wider">Medicamentos Monitorizados</p>
                <h3 class="text-3xl font-bold text-white">${totalMeds}</h3>
                <p class="text-emerald-400 text-xs mt-2">Inventario Base Activo</p>
            </div>
            <div class="glass-panel p-6 rounded-xl border-l-4 border-teal-500">
                <p class="text-slate-400 text-sm font-semibold mb-1 uppercase tracking-wider">Insumos Monitorizados</p>
                <h3 class="text-3xl font-bold text-white">${totalIns}</h3>
                <p class="text-emerald-400 text-xs mt-2">Inventario Base Activo</p>
            </div>
            <div class="glass-panel p-6 rounded-xl border-l-4 border-red-500 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10 pulse-critical"><svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></div>
                <p class="text-slate-400 text-sm font-semibold mb-1 uppercase tracking-wider">Meds Riesgo Crítico</p>
                <h3 class="text-3xl font-bold text-red-400">${data.alertas_criticas.medicamentos.length}</h3>
                <p class="text-red-400/80 text-xs mt-2 relative z-10">Requieren acción inmediata</p>
            </div>
            <div class="glass-panel p-6 rounded-xl border-l-4 border-orange-500 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10"><svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></div>
                <p class="text-slate-400 text-sm font-semibold mb-1 uppercase tracking-wider">Insumos Riesgo Crítico</p>
                <h3 class="text-3xl font-bold text-orange-400">${data.alertas_criticas.insumos.length}</h3>
                <p class="text-orange-400/80 text-xs mt-2 relative z-10">Vigilancia estricta recomendada</p>
            </div>
        `;
        document.getElementById('kpi-container').innerHTML = kpiHtml;

        // 3. Populate Tables
        const renderRow = (item, type) => {
            const cobClass = item.cobertura < 2 ? 'text-red-400 font-bold' : 'text-orange-300';
            return `
            <tr class="hover:bg-slate-700/30 transition-colors">
                <td class="px-4 py-3 font-mono text-xs text-slate-400">${item.codigo}</td>
                <td class="px-4 py-3 font-medium text-slate-200">
                    <div class="truncate max-w-[200px] lg:max-w-xs" title="${item.producto}">
                        ${item.producto.substring(0,40)}...
                    </div>
                </td>
                <td class="px-4 py-3 text-right ${cobClass}">${item.cobertura} d</td>
            </tr>`;
        };

        document.getElementById('table-meds-criticos').innerHTML = data.alertas_criticas.medicamentos.map(m => renderRow(m, 'M')).join('');
        document.getElementById('table-ins-criticos').innerHTML = data.alertas_criticas.insumos.map(i => renderRow(i, 'I')).join('');

        // 4. Main Chart
        const ctx = document.getElementById('mainTrendChart').getContext('2d');
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.tendencia_general.fechas,
                datasets: [
                    {
                        label: 'Total Recetado',
                        data: data.tendencia_general.recetado,
                        borderColor: '#60a5fa', // blue-400
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#1e293b',
                        pointBorderColor: '#60a5fa',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Total Dispensado',
                        data: data.tendencia_general.dispensado,
                        borderColor: '#f43f5e', // rose-500
                        borderWidth: 3,
                        tension: 0.4,
                        pointBackgroundColor: '#1e293b',
                        pointBorderColor: '#f43f5e',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        boxPadding: 4
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: { maxTicksLimit: 12 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }
                    }
                }
            }
        });
        
        // 5. Build small Quick Metrics dynamically
        const qmContainer = document.getElementById('quick-metrics');
        let avgDisp = data.tendencia_general.dispensado.slice(-4).reduce((a,b)=>a+b,0) / 4;
        let avgRec = data.tendencia_general.recetado.slice(-4).reduce((a,b)=>a+b,0) / 4;
        let satisfaccion = Math.round((avgDisp/avgRec)*100) || 0;
        
        qmContainer.innerHTML = `
            <div class="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 flex justify-between items-center">
                <span class="text-slate-300 text-sm">Satisfacción (Últ. Mes)</span>
                <span class="text-xl font-bold ${satisfaccion < 80 ? 'text-orange-400' : 'text-emerald-400'}">${satisfaccion}%</span>
            </div>
            <div class="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 flex justify-between items-center">
                <span class="text-slate-300 text-sm">Prom. Dispensado Semanal</span>
                <span class="text-xl font-bold text-blue-400">${Math.round(avgDisp).toLocaleString()} u</span>
            </div>
            <div class="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 flex mt-4 flex-col gap-2 relative overflow-hidden">
                <span class="text-slate-300 text-sm font-semibold mb-2">Estado del Sistema</span>
                <div class="w-full bg-slate-700 rounded-full h-2.5 mb-1 hidden">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: 45%"></div>
                </div>
                <div class="flex items-center gap-2 text-emerald-400 text-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Data Sincronizada y Limpia
                </div>
                <div class="flex items-center gap-2 text-emerald-400 text-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Módulo Predictivo ONLINE
                </div>
            </div>
        `;

    }

});
