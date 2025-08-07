// 全局变量
let priceChart = null;
let monitorInterval = null;
let currentTokenData = null;
let priceHistory = [];
let phantomWallet = null;
let walletConnected = false;
// const HOSTURL = "https://api.phantom.app"
// 这个地址可以替换为自己的API服务, js参考根目录下的worker.js
const HOSTURL = "https://voyeur.joejoejoe.cc"

// V2EX代币常量
const V2EX_TOKEN_MINT = "9raUVuzeWUk53co63M4WXLWPWE4Xc6Lpn7RS9dnkpump";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
// 默认接收地址（可以修改）
const DEFAULT_RECIPIENT_ADDRESS = "Dz9pHt2CFNWwgDm2JG85yBFHfbJ5noMA5k13ZvbVeNGF";

// SOL常量
const LAMPORTS_PER_SOL = 1000000000;

// RPC节点列表（按优先级排序）
const RPC_NODES = [
    "https://solana-rpc.publicnode.com",
];

// 选择最佳RPC节点的函数
async function selectBestRPC() {
    for (const rpc of RPC_NODES) {
        try {
            const connection = new solanaWeb3.Connection(rpc, "recent");
            // 测试连接
            await connection.getEpochInfo();
            console.log("选择RPC节点:", rpc);
            return rpc;
        } catch (error) {
            console.log("RPC节点不可用:", rpc, error.message);
            continue;
        }
    }
    // 如果所有节点都不可用，则使用默认节点
    console.log("所有RPC节点都不可用，使用默认节点");
    return solanaWeb3.clusterApiUrl('mainnet-beta');
}

// DOM 元素
const elements = {
    tokenAddress: document.getElementById('tokenAddress'),
    searchBtn: document.getElementById('searchBtn'),
    tokenInfo: document.getElementById('tokenInfo'),
    currentPrice: document.getElementById('currentPrice'),

    lastUpdated: document.getElementById('lastUpdated'),
    priceChange24h: document.getElementById('priceChange24h'),
    priceChart: document.getElementById('priceChart'),
    timeRange: document.getElementById('timeRange'),
    buyPrice: document.getElementById('buyPrice'),
    sellPrice: document.getElementById('sellPrice'),
    buyAmount: document.getElementById('buyAmount'), // 新增买入数量输入框
    sellAmount: document.getElementById('sellAmount'), // 新增卖出数量输入框
    monitorBuy: document.getElementById('monitorBuy'),
    monitorSell: document.getElementById('monitorSell'),
    autoTrade: document.getElementById('autoTrade'),
    checkInterval: document.getElementById('checkInterval'),
    startMonitor: document.getElementById('startMonitor'),
    stopMonitor: document.getElementById('stopMonitor'),
    monitorStatus: document.getElementById('monitorStatus'),
    statusText: document.getElementById('statusText'),
    lastCheckTime: document.getElementById('lastCheckTime'),
    lastCheckPrice: document.getElementById('lastCheckPrice'),
    recipientAddress: document.getElementById('recipientAddress'),
    tipToken: document.getElementById('tipToken'),
    tipAmount: document.getElementById('tipAmount'),
    connectWallet: document.getElementById('connectWallet'),
    sendTip: document.getElementById('sendTip'),
    tipStatus: document.getElementById('tipStatus'),
    tipMessage: document.getElementById('tipMessage'),

    notifications: document.getElementById('notifications')
};

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    initializeChart();
});

// 事件监听器初始化
function initializeEventListeners() {
    elements.searchBtn.addEventListener('click', searchToken);
    elements.startMonitor.addEventListener('click', startMonitoring);
    elements.stopMonitor.addEventListener('click', stopMonitoring);
    elements.sendTip.addEventListener('click', sendTip);
    elements.tipToken.addEventListener('change', updateTipAmount);
    elements.connectWallet.addEventListener('click', connectPhantomWallet);
    elements.timeRange.addEventListener('change', updateChartTimeRange);
    elements.monitorBuy.addEventListener('change', validateMonitorSettings);
    elements.monitorSell.addEventListener('change', validateMonitorSettings);

    // 回车键搜索
    elements.tokenAddress.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchToken();
        }
    });

    // 检查Phantom钱包是否已安装
    checkPhantomWallet();
}

// 更新打赏金额
function updateTipAmount() {
    const selectedToken = elements.tipToken.value;
    if (selectedToken === 'V2EX') {
        elements.tipAmount.value = '50';
    } else if (selectedToken === 'SOL') {
        elements.tipAmount.value = '0.005';
    }
}

// 初始化图表
function initializeChart() {
    const ctx = elements.priceChart.getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '价格 (USD)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return '价格: $' + context.parsed.y.toFixed(6).replace(/\.?0+$/, '');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toFixed(6).replace(/\.?0+$/, '');
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// 搜索代币
async function searchToken() {
    const tokenAddress = elements.tokenAddress.value.trim();

    if (!tokenAddress) {
        showNotification('请输入代币地址', 'error');
        return;
    }

    try {
        elements.searchBtn.innerHTML = '<span class="loading"></span> 查询中...';
        elements.searchBtn.disabled = true;

        // 模拟API调用 - 实际项目中需要替换为真实的Solana API
        const tokenData = await fetchTokenData(tokenAddress);

        if (tokenData) {
            currentTokenData = tokenData;
            displayTokenInfo(tokenData);
            showNotification('代币信息获取成功', 'success');
        } else {
            showNotification('无法获取代币信息', 'error');
        }
    } catch (error) {
        console.error('搜索代币错误:', error);
        showNotification('搜索代币时发生错误', 'error');
    } finally {
        elements.searchBtn.innerHTML = '查询';
        elements.searchBtn.disabled = false;
    }
}

// 获取代币数据（真实API）
async function fetchTokenData(tokenAddress) {
    console.log('正在查询代币:', tokenAddress);

    // 使用Phantom价格API获取代币数据
    let priceData = null;
    try {
        console.log('获取Phantom价格数据...');
        const priceRes = await fetch(`${HOSTURL}/price/v1/solana:101/address/${tokenAddress}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (priceRes.ok) {
            priceData = await priceRes.json();
            console.log('Phantom价格API响应:', priceData);
        }
    } catch (e) {
        console.error('Phantom价格API失败:', e);
    }

    // 如果价格API失败，返回null
    if (!priceData || !priceData.price) {
        console.log('Phantom价格API失败，无法获取代币数据');
        return null;
    }

    // 获取历史价格数据
    let historyData = null;
    try {
        console.log('获取历史价格数据...');
        const historyRes = await fetch(`${HOSTURL}/price-history/v1?token=solana:101/address:${tokenAddress}&type=1H`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (historyRes.ok) {
            historyData = await historyRes.json();
            console.log('Phantom历史价格API响应:', historyData);
        }
    } catch (e) {
        console.error('Phantom历史价格API失败:', e);
    }



    const result = {
        price: priceData.price,
        priceChange24h: priceData.priceChange24h,
        lastUpdatedAt: priceData.lastUpdatedAt,
        address: tokenAddress,
        historyData: historyData,
        phantomData: {
            token: {
                price: priceData.price,
                priceChange24h: priceData.priceChange24h,
                lastUpdatedAt: priceData.lastUpdatedAt
            }
        }
    };

    console.log('返回代币数据:', result);
    return result;
}

// 显示代币信息
function displayTokenInfo(tokenData) {
    elements.currentPrice.textContent = `$${tokenData.price.toFixed(6)}`;
    elements.tokenInfo.classList.remove('hidden');

    // 显示价格信息
    if (tokenData.phantomData && tokenData.phantomData.token) {
        const phantomToken = tokenData.phantomData.token;

        // 最后更新时间
        if (phantomToken.lastUpdatedAt) {
            const lastUpdated = new Date(phantomToken.lastUpdatedAt);
            elements.lastUpdated.textContent = lastUpdated.toLocaleString('zh-CN');
        } else {
            elements.lastUpdated.textContent = '-';
        }

        // 价格变化
        if (phantomToken.priceChange24h !== undefined) {
            const change = phantomToken.priceChange24h;
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            elements.priceChange24h.textContent = changeText;
            elements.priceChange24h.className = `change-value ${change >= 0 ? 'price-up' : 'price-down'}`;
        } else {
            elements.priceChange24h.textContent = '-';
        }

        console.log('显示价格信息:', phantomToken);
    }

    // 初始化历史价格图表
    if (tokenData.historyData && tokenData.historyData.history) {
        initializeHistoryChart(tokenData.historyData.history);
    }
}

// 初始化历史价格图表
function initializeHistoryChart(historyData) {
    // 清空现有数据
    priceHistory = [];

    // 转换历史数据格式
    const labels = [];
    const prices = [];

    historyData.forEach(item => {
        const date = new Date(item.unixTime * 1000);
        const timeLabel = date.toLocaleDateString('zh-CN');
        const price = parseFloat(item.value);

        labels.push(timeLabel);
        prices.push(price);

        // 保存到历史记录中
        priceHistory.push({
            time: timeLabel,
            price: price
        });
    });

    // 更新图表
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.update('none');

    console.log('历史价格图表初始化完成，数据点数量:', historyData.length);
}

// 更新图表时间范围
async function updateChartTimeRange() {
    if (!currentTokenData || !currentTokenData.address) {
        showNotification('请先查询代币信息', 'error');
        return;
    }

    const timeRange = elements.timeRange.value;
    console.log('更新图表时间范围:', timeRange);

    try {
        // 获取新的历史数据
        const historyRes = await fetch(`${HOSTURL}/price-history/v1?token=solana:101/address:${currentTokenData.address}&type=${timeRange}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (historyRes.ok) {
            const historyData = await historyRes.json();
            console.log('新的历史数据响应:', historyData);

            if (historyData && historyData.history) {
                // 清空现有数据
                priceHistory = [];

                // 转换历史数据格式
                const labels = [];
                const prices = [];

                historyData.history.forEach(item => {
                    const date = new Date(item.unixTime * 1000);
                    let timeLabel;

                    // 根据时间范围格式化标签
                    if (timeRange === '1H') {
                        timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                    } else if (timeRange === '1D') {
                        timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                    } else {
                        timeLabel = date.toLocaleDateString('zh-CN');
                    }

                    const price = parseFloat(item.value);

                    labels.push(timeLabel);
                    prices.push(price);

                    // 保存到历史记录中
                    priceHistory.push({
                        time: timeLabel,
                        price: price
                    });
                });

                // 更新图表
                priceChart.data.labels = labels;
                priceChart.data.datasets[0].data = prices;
                priceChart.update('none');

                console.log('图表时间范围更新完成，数据点数量:', historyData.history.length);
                showNotification('图表时间范围更新成功', 'success');
            }
        } else {
            throw new Error(`历史数据请求失败: ${historyRes.status}`);
        }
    } catch (e) {
        console.error('更新图表时间范围失败:', e);
        showNotification('更新图表时间范围失败', 'error');
    }
}

// 更新图表
function updateChart(price) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();

    priceHistory.push({
        time: timeLabel,
        price: price
    });

    // 保持最近50个数据点
    if (priceHistory.length > 50) {
        priceHistory.shift();
    }

    const labels = priceHistory.map(item => item.time);
    const prices = priceHistory.map(item => item.price);

    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.update('none');
}

// 验证监控设置
function validateMonitorSettings() {
    const monitorBuy = elements.monitorBuy.checked;
    const monitorSell = elements.monitorSell.checked;

    // 必须至少选择一种监控类型
    if (!monitorBuy && !monitorSell) {
        showNotification('请至少选择一种监控类型', 'error');
        // 自动选中买入监控
        elements.monitorBuy.checked = true;
        return false;
    }

    return true;
}

// 开始监控
async function startMonitoring() {
    const buyPrice = parseFloat(elements.buyPrice.value);
    const sellPrice = parseFloat(elements.sellPrice.value);
    const interval = parseInt(elements.checkInterval.value);
    const monitorBuy = elements.monitorBuy.checked;
    const monitorSell = elements.monitorSell.checked;
    const autoTrade = elements.autoTrade.checked;

    // 只有在选中自动交易时才要求连接钱包
    if (autoTrade && !walletConnected) {
        showNotification('自动交易需要先连接Phantom钱包', 'error');
        return;
    }

    if (!currentTokenData) {
        showNotification('请先查询代币信息', 'error');
        return;
    }

    // 验证监控设置
    if (!validateMonitorSettings()) {
        return;
    }

    // 检查是否填写了必要的价格
    if (monitorBuy && !buyPrice) {
        showNotification('请填写买入价格', 'error');
        return;
    }

    if (monitorSell && !sellPrice) {
        showNotification('请填写卖出价格', 'error');
        return;
    }

    if (!interval) {
        showNotification('请填写检查频率', 'error');
        return;
    }

    // 如果同时监控买入和卖出，检查价格关系
    if (monitorBuy && monitorSell && buyPrice >= sellPrice) {
        showNotification('买入价格必须低于卖出价格', 'error');
        return;
    }

    if (interval < 1) {
        showNotification('检查频率不能少于2秒', 'error');
        return;
    }

    // 请求浏览器通知权限（如果不自动交易）
    if (!autoTrade) {
        const notificationGranted = await requestNotificationPermission();
        if (!notificationGranted) {
            showNotification('需要通知权限来发送交易提醒', 'warning');
        }
    }

    // 开始监控
    monitorInterval = setInterval(() => {
        checkPrice();
    }, interval * 1000);

    elements.startMonitor.classList.add('hidden');
    elements.stopMonitor.classList.remove('hidden');
    elements.monitorStatus.classList.remove('hidden');
    elements.statusText.textContent = '监控中...';

    showNotification('价格监控已启动', 'success');
}

// 停止监控
function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }

    elements.startMonitor.classList.remove('hidden');
    elements.stopMonitor.classList.add('hidden');
    elements.monitorStatus.classList.add('hidden');

    showNotification('价格监控已停止', 'success');
}

// 检查价格
async function checkPrice() {
    if (!currentTokenData) return;
    // 获取最新价格
    let newPrice = currentTokenData.price;
    let priceUpdated = false;

    try {
        // 使用Phantom价格API获取最新价格
        if (currentTokenData.address) {
            const phantomRes = await fetch(`${HOSTURL}/price/v1/solana:101/address/${currentTokenData.address}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (phantomRes.ok) {
                const phantomData = await phantomRes.json();
                if (phantomData && phantomData.price) {
                    newPrice = phantomData.price;
                    currentTokenData.price = newPrice;
                    priceUpdated = true;
                    console.log('从Phantom获取最新价格:', newPrice);
                }
            }
        }
    } catch (e) {
        console.error('获取最新价格失败:', e);
    }

    // 如果Phantom API失败，停止监控
    if (!priceUpdated) {
        console.log('Phantom API失败，停止价格监控');
        stopMonitoring();
        showNotification('无法获取最新价格，监控已停止', 'error');
        return;
    }

    // 更新显示
    elements.currentPrice.textContent = `$${newPrice.toFixed(6)}`;
    updateChart(newPrice);

    // 更新最后检查时间和价格
    const now = new Date();
    elements.lastCheckTime.textContent = now.toLocaleTimeString();
    elements.lastCheckPrice.textContent = `$${newPrice.toFixed(6)}`;
    elements.lastUpdated.textContent = now.toLocaleString('zh-CN');

    // 检查交易信号
    const monitorBuy = elements.monitorBuy.checked;
    const monitorSell = elements.monitorSell.checked;
    const autoTrade = elements.autoTrade.checked;
    const buyPrice = parseFloat(elements.buyPrice.value);
    const sellPrice = parseFloat(elements.sellPrice.value);

    if (monitorBuy && buyPrice && newPrice <= buyPrice) {
        const message = `买入信号！当前价格 $${newPrice.toFixed(6)} 低于买入价格 $${buyPrice}`;
        showNotification(message, 'success');

        if (autoTrade) {
            // 触发信号后停止监控
            stopMonitoring();
            // 自动买入逻辑
            try {
                showNotification('执行自动买入...', 'info');
                await executeBuy(newPrice, buyPrice);
                showNotification('自动买入执行完成', 'success');
            } catch (error) {
                console.error('自动买入失败:', error);
                showNotification(`自动买入失败: ${error.message}`, 'error');
            }
        } else {
            // 如果不自动交易，发送浏览器通知
            sendBrowserNotification(
                '买入信号提醒',
                message,
                '/favicon.ico'
            );
        }
    }

    if (monitorSell && sellPrice && newPrice >= sellPrice) {
        const message = `卖出信号！当前价格 $${newPrice.toFixed(6)} 高于卖出价格 $${sellPrice}`;
        showNotification(message, 'success');

        if (autoTrade) {
            // 触发信号后停止监控
            stopMonitoring();
            // 自动卖出逻辑
            try {
                showNotification('执行自动卖出...', 'info');
                await executeSell(newPrice, sellPrice);
                showNotification('自动卖出执行完成', 'success');
            } catch (error) {
                console.error('自动卖出失败:', error);
                showNotification(`自动卖出失败: ${error.message}`, 'error');
            }
        } else {
            // 如果不自动交易，发送浏览器通知
            sendBrowserNotification(
                '卖出信号提醒',
                message,
                '/favicon.ico'
            );
        }
    }
}

// 自动买入功能
async function executeBuy(currentPrice, targetPrice) {
    if (!walletConnected || !phantomWallet) {
        throw new Error('钱包未连接');
    }

    try {
        // 获取用户设置的买入数量
        const buyAmount = parseFloat(elements.buyAmount.value) || 0.01; // 默认买入0.01 SOL worth的代币

        // 使用Jupiter API获取交易报价
        const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${currentTokenData.address}&amount=${buyAmount * LAMPORTS_PER_SOL}&slippageBps=50`);

        if (!quoteResponse.ok) {
            throw new Error('无法获取交易报价');
        }

        const quote = await quoteResponse.json();

        // 获取交易数据
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: phantomWallet.publicKey.toString(),
                wrapAndUnwrapSol: true
            })
        });

        if (!swapResponse.ok) {
            throw new Error('无法创建交易');
        }

        const swapData = await swapResponse.json();

        // 使用Phantom钱包签名并发送交易
        // 修复：正确处理VersionedTransaction数据
        const transactionBuf = Uint8Array.from(atob(swapData.swapTransaction), c => c.charCodeAt(0));
        const transaction = solanaWeb3.VersionedTransaction.deserialize(transactionBuf);
        const signed = await phantomWallet.signTransaction(transaction);
        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
        const signature = await connection.sendRawTransaction(signed.serialize());

        // 等待交易确认
        await connection.confirmTransaction(signature);

        showNotification(`买入交易成功，交易签名: ${signature.slice(0, 8)}...`, 'success');

    } catch (error) {
        console.error('买入执行失败:', error);
        throw new Error(`买入失败: ${error.message}`);
    }
}

// 自动卖出功能
async function executeSell(currentPrice, targetPrice) {
    if (!walletConnected || !phantomWallet) {
        throw new Error('钱包未连接');
    }

    try {
        // 获取用户设置的卖出数量
        const sellAmount = parseFloat(elements.sellAmount.value) || 100; // 默认卖出100个代币

        // 使用Jupiter API获取交易报价
        const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${currentTokenData.address}&outputMint=So11111111111111111111111111111111111111112&amount=${sellAmount * 1000000}&slippageBps=50`);

        if (!quoteResponse.ok) {
            throw new Error('无法获取交易报价');
        }

        const quote = await quoteResponse.json();

        // 获取交易数据
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: phantomWallet.publicKey.toString(),
                wrapAndUnwrapSol: true
            })
        });

        if (!swapResponse.ok) {
            throw new Error('无法创建交易');
        }

        const swapData = await swapResponse.json();

        // 使用Phantom钱包签名并发送交易
        // 修复：正确处理VersionedTransaction数据
        const transactionBuf = Uint8Array.from(atob(swapData.swapTransaction), c => c.charCodeAt(0));
        const transaction = solanaWeb3.VersionedTransaction.deserialize(transactionBuf);
        const signed = await phantomWallet.signTransaction(transaction);
        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
        const signature = await connection.sendRawTransaction(signed.serialize());

        // 等待交易确认
        await connection.confirmTransaction(signature);

        showNotification(`卖出交易成功，交易签名: ${signature.slice(0, 8)}...`, 'success');
    } catch (error) {
        console.error('卖出执行失败:', error);
        throw new Error(`卖出失败: ${error.message}`);
    }
}


// 检查Phantom钱包是否已安装
function checkPhantomWallet() {
    if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
        phantomWallet = window.solana;
        console.log('Phantom钱包已检测到');

        // 检查是否已连接
        if (phantomWallet.isConnected) {
            walletConnected = true;
            updateWalletStatus();
        }
    } else {
        console.log('Phantom钱包未安装');
        showNotification('请先安装Phantom钱包扩展', 'error');
    }
}

// 连接Phantom钱包
async function connectPhantomWallet() {
    try {
        if (!phantomWallet) {
            showNotification('请先安装Phantom钱包扩展', 'error');
            return;
        }

        elements.connectWallet.innerHTML = '<span class="loading"></span> 连接中...';
        elements.connectWallet.disabled = true;

        // 连接钱包
        const response = await phantomWallet.connect();
        console.log('钱包连接成功:', response.publicKey.toString());

        walletConnected = true;
        updateWalletStatus();
        showNotification('Phantom钱包连接成功！', 'success');



    } catch (error) {
        console.error('钱包连接失败:', error);
        showNotification('钱包连接失败: ' + error.message, 'error');
        // 连接失败时重置按钮状态
        elements.connectWallet.innerHTML = '连接Phantom钱包';
        elements.connectWallet.disabled = false;
        elements.connectWallet.classList.add('btn-wallet-connect');
        elements.connectWallet.classList.remove('btn-secondary');
    }
}

// 更新钱包状态显示
function updateWalletStatus() {
    if (walletConnected) {
        elements.sendTip.disabled = false;
        elements.connectWallet.innerHTML = '已连接';
        elements.connectWallet.disabled = true;
        elements.connectWallet.classList.add('btn-success');
        elements.connectWallet.classList.remove('btn-secondary', 'btn-wallet-connect');
    } else {
        elements.sendTip.disabled = true;
        elements.connectWallet.innerHTML = '连接Phantom钱包';
        elements.connectWallet.disabled = false;
        elements.connectWallet.classList.remove('btn-success');
        elements.connectWallet.classList.add('btn-wallet-connect');
        elements.connectWallet.classList.remove('btn-secondary');
    }
}
/// 发送打赏
async function sendTip() {
    if (!walletConnected) {
        showNotification('请先连接Phantom钱包', 'error');
        return;
    }

    const recipientAddress = elements.recipientAddress.value.trim();
    const tipAmount = parseFloat(elements.tipAmount.value);
    const tipToken = elements.tipToken.value;

    if (!recipientAddress) {
        showNotification('请输入接收地址', 'error');
        return;
    }

    if (!tipAmount || tipAmount <= 0) {
        showNotification('请输入有效的打赏数量', 'error');
        return;
    }

    // 验证Solana地址格式
    if (!isValidSolanaAddress(recipientAddress)) {
        showNotification('请输入有效的Solana地址', 'error');
        return;
    }

    try {
        elements.sendTip.innerHTML = '<span class="loading"></span> 发送中...';
        elements.sendTip.disabled = true;

        let signature;

        if (tipToken === 'SOL') {
            // 发送SOL
            try {
                // 选择最佳RPC节点
                const rpcUrl = await selectBestRPC();
                console.log("使用RPC节点:", rpcUrl);

                // 创建连接到Solana网络
                const connection = new solanaWeb3.Connection(rpcUrl);

                // 获取最新的blockhash
                const { blockhash } = await connection.getLatestBlockhash();

                // 创建交易
                const transaction = new solanaWeb3.Transaction({
                    recentBlockhash: blockhash,
                    feePayer: phantomWallet.publicKey
                });

                // 创建转账指令
                const instruction = solanaWeb3.SystemProgram.transfer({
                    fromPubkey: phantomWallet.publicKey,
                    toPubkey: new solanaWeb3.PublicKey(recipientAddress),
                    lamports: tipAmount * LAMPORTS_PER_SOL
                });

                // 添加指令到交易
                transaction.add(instruction);

                // 发送交易
                const { signature: txSignature } = await phantomWallet.signAndSendTransaction(transaction);
                signature = txSignature;

                console.log('SOL转账成功:', signature);

            } catch (error) {
                console.error('SOL转账失败:', error);
                throw new Error('SOL转账失败: ' + error.message);
            }

        } else if (tipToken === 'V2EX') {
            // 发送V2EX代币
            try {
                // 选择最佳RPC节点
                const rpcUrl = await selectBestRPC();
                console.log("使用RPC节点:", rpcUrl);

                // 创建连接到Solana网络
                const connection = new solanaWeb3.Connection(rpcUrl);

                // 获取发送方关联代币账户地址
                let fromATA = await getAssociatedTokenAddress(phantomWallet.publicKey, new solanaWeb3.PublicKey(V2EX_TOKEN_MINT), rpcUrl);

                // 如果发送方没有关联账户，需要创建
                if (!fromATA) {
                    // 创建交易来创建发送方的关联代币账户
                    const createFromATAInstruction = solanaWeb3.Token.createAssociatedTokenAccountInstruction(
                        new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                        new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                        new solanaWeb3.PublicKey(V2EX_TOKEN_MINT),
                        await solanaWeb3.Token.getAssociatedTokenAddress(
                            new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                            new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
                            new solanaWeb3.PublicKey(V2EX_TOKEN_MINT),
                            phantomWallet.publicKey
                        ),
                        phantomWallet.publicKey,
                        phantomWallet.publicKey
                    );

                    const createFromATATransaction = new solanaWeb3.Transaction();
                    createFromATATransaction.add(createFromATAInstruction);

                    const { blockhash: createFromATABlockhash } = await connection.getLatestBlockhash();
                    createFromATATransaction.recentBlockhash = createFromATABlockhash;
                    createFromATATransaction.feePayer = phantomWallet.publicKey;

                    // 发送创建账户的交易
                    const { signature: createFromATASignature } = await phantomWallet.signAndSendTransaction(createFromATATransaction);
                    console.log('创建发送方V2EX关联账户成功:', createFromATASignature);

                    // 等待交易确认
                    await connection.confirmTransaction(createFromATASignature, 'confirmed');

                    // 重新获取账户地址
                    fromATA = await getAssociatedTokenAddress(phantomWallet.publicKey, new solanaWeb3.PublicKey(V2EX_TOKEN_MINT), rpcUrl);
                }

                if (!fromATA) {
                    throw new Error('无法创建V2EX代币账户');
                }

                // 获取接收方关联代币账户地址
                let toATA = await getAssociatedTokenAddress(new solanaWeb3.PublicKey(recipientAddress), new solanaWeb3.PublicKey(V2EX_TOKEN_MINT), rpcUrl);

                // 构建交易
                const transaction = new solanaWeb3.Transaction();

                // 如果接收方没有关联账户，需要创建
                if (!toATA) {
                    const createATAInstruction = solanaWeb3.Token.createAssociatedTokenAccountInstruction(
                        new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                        new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                        new solanaWeb3.PublicKey(V2EX_TOKEN_MINT),
                        await solanaWeb3.Token.getAssociatedTokenAddress(
                            new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                            new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
                            new solanaWeb3.PublicKey(V2EX_TOKEN_MINT),
                            new solanaWeb3.PublicKey(recipientAddress)
                        ),
                        new solanaWeb3.PublicKey(recipientAddress),
                        phantomWallet.publicKey
                    );
                    transaction.add(createATAInstruction);

                    // 更新toATA为将要创建的账户地址
                    toATA = await solanaWeb3.Token.getAssociatedTokenAddress(
                        new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
                        new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
                        new solanaWeb3.PublicKey(V2EX_TOKEN_MINT),
                        new solanaWeb3.PublicKey(recipientAddress)
                    );
                }

                // 创建转账指令数据
                const transferInstructionData = createTransferInstructionData(tipAmount * 1000000); // V2EX代币有6位小数

                // 创建转账指令
                const transferInstruction = new solanaWeb3.TransactionInstruction({
                    keys: [
                        { pubkey: fromATA, isSigner: false, isWritable: true },
                        { pubkey: toATA, isSigner: false, isWritable: true },
                        { pubkey: phantomWallet.publicKey, isSigner: true, isWritable: false }
                    ],
                    programId: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
                    data: transferInstructionData
                });

                transaction.add(transferInstruction);

                // 获取最新的blockhash
                const { blockhash } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = phantomWallet.publicKey;

                // 发送交易
                const { signature: txSignature } = await phantomWallet.signAndSendTransaction(transaction);
                signature = txSignature;

                console.log('V2EX代币转账成功:', signature);

            } catch (error) {
                console.error('V2EX代币转账失败:', error);
                throw new Error('V2EX代币转账失败: ' + error.message);
            }
        }

        if (signature) {
            elements.tipMessage.textContent = `成功发送 ${tipAmount} ${tipToken} 到 ${recipientAddress.slice(0, 8)}...`;
            elements.tipStatus.classList.remove('error');
            elements.tipStatus.classList.remove('hidden');
            showNotification(`${tipToken}打赏发送成功！交易签名: ${signature.slice(0, 8)}...`, 'success');
        }

    } catch (error) {
        console.error('交易失败:', error);
        let errorMessage = '发送失败';

        if (error.code === 4001) {
            errorMessage = '用户取消了交易';
        } else if (error.code === -32002) {
            errorMessage = '请检查Phantom钱包并确认交易';
        } else {
            errorMessage = error.message || '未知错误';
        }

        elements.tipMessage.textContent = errorMessage;
        elements.tipStatus.classList.add('error');
        elements.tipStatus.classList.remove('hidden');
        showNotification(`${tipToken}打赏发送失败: ${errorMessage}`, 'error');
    } finally {
        elements.sendTip.innerHTML = '发送打赏';
        elements.sendTip.disabled = false;
    }
}

// 获取关联代币账户地址的辅助函数
async function getAssociatedTokenAddress(walletPublicKey, mintPublicKey, rpcUrl = null) {
    try {
        const connection = rpcUrl ? new solanaWeb3.Connection(rpcUrl) : new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
        const tokenProgramId = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);

        // 尝试获取现有的关联代币账户
        const response = await connection.getTokenAccountsByOwner(walletPublicKey, { mint: mintPublicKey });
        if (response.value.length > 0) {
            return response.value[0].pubkey;
        }
        return null;
    } catch (err) {
        console.error("获取关联代币账户失败:", err);
        return null;
    }
}

// 创建转账指令数据的辅助函数
function createTransferInstructionData(amount) {
    const data = new Uint8Array(9);
    data[0] = 3; // 转账指令标识

    // 将amount转换为小端序的u64
    const amountBigInt = BigInt(amount);
    for (let i = 0; i < 8; i++) {
        data[i + 1] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xff));
    }

    return data;
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    elements.notifications.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 工具函数：格式化地址
function formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

// 工具函数：验证Solana地址
function isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// 请求浏览器通知权限
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

// 发送浏览器通知
function sendBrowserNotification(title, body, icon = null) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: icon,
            requireInteraction: true
        });
    }
}

// 页面卸载时清理
window.addEventListener('beforeunload', function () {
    if (monitorInterval) {
        clearInterval(monitorInterval);
    }
}); 