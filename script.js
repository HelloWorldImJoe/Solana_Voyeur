// 全局变量
let priceChart = null;
let priceMonitorInterval = null; // 统一价格监控定时器
let currentTokenData = null;
let priceHistory = [];
let wallet = null; // 使用本地钱包导入
let walletConnected = false;
let buyCount = 0; // 买入执行次数
let sellCount = 0; // 卖出执行次数
let lastSellSignalTime = 0; // 上次卖出信号时间
let lastBuySignalTime = 0; // 上次买入信号时间
let sellSignalCooldown = 30000; // 卖出信号冷却时间（30秒）
let buySignalCooldown = 30000; // 买入信号冷却时间（30秒）
const HOSTURL = "https://api.phantom.app"

// localStorage 键名常量
const STORAGE_KEYS = {
    TOKEN_ADDRESS: 'solana_voyeur_token_address',
    BUY_PRICE: 'solana_voyeur_buy_price',
    SELL_PRICE: 'solana_voyeur_sell_price',
    BUY_AMOUNT: 'solana_voyeur_buy_amount',
    SELL_AMOUNT: 'solana_voyeur_sell_amount',
    BUY_TIMES: 'solana_voyeur_buy_times',
    SELL_TIMES: 'solana_voyeur_sell_times',
    MONITOR_BUY: 'solana_voyeur_monitor_buy',
    MONITOR_SELL: 'solana_voyeur_monitor_sell',
    AUTO_TRADE: 'solana_voyeur_auto_trade',
    CHECK_INTERVAL: 'solana_voyeur_check_interval',
    SIGNAL_COOLDOWN: 'solana_voyeur_signal_cooldown',
    RECIPIENT_ADDRESS: 'solana_voyeur_recipient_address',
    TIP_TOKEN: 'solana_voyeur_tip_token',
    TIP_AMOUNT: 'solana_voyeur_tip_amount'
};

// V2EX代币常量
const V2EX_TOKEN_MINT = "9raUVuzeWUk53co63M4WXLWPWE4Xc6Lpn7RS9dnkpump";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
// 默认接收地址（可以修改）
const DEFAULT_RECIPIENT_ADDRESS = "v2ex_joejoejoe.sol";

// SOL常量
const LAMPORTS_PER_SOL = 1000000000;

// RPC节点列表（按优先级排序）
const RPC_NODE = "https://solana-rpc.publicnode.com";

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
    buyTimes: document.getElementById('buyTimes'), // 买入次数输入框
    sellAmount: document.getElementById('sellAmount'), // 新增卖出数量输入框
    sellTimes: document.getElementById('sellTimes'), // 卖出次数输入框
    monitorBuy: document.getElementById('monitorBuy'),
    monitorSell: document.getElementById('monitorSell'),
    autoTrade: document.getElementById('autoTrade'),
    checkInterval: document.getElementById('checkInterval'),
    signalCooldown: document.getElementById('signalCooldown'), // 信号冷却时间输入框
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
    importWalletFile: document.getElementById('importWalletFile'),
    showWalletInfo: document.getElementById('showWalletInfo'),
    sendTip: document.getElementById('sendTip'),
    tipStatus: document.getElementById('tipStatus'),
    tipMessage: document.getElementById('tipMessage'),

    notifications: document.getElementById('notifications')
};

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    initializeChart();
    loadUserSettings(); // 加载用户设置
});

// 事件监听器初始化
function initializeEventListeners() {
    elements.searchBtn.addEventListener('click', searchToken);
    elements.startMonitor.addEventListener('click', startMonitoring);
    elements.stopMonitor.addEventListener('click', stopMonitoring);
    elements.sendTip.addEventListener('click', sendTip);
    elements.tipToken.addEventListener('change', updateTipAmount);
    elements.connectWallet.addEventListener('click', importWallet);
    elements.importWalletFile.addEventListener('click', importWalletFromFile);
    elements.showWalletInfo.addEventListener('click', showWalletInfo);
    elements.timeRange.addEventListener('change', updateChartTimeRange);
    elements.monitorBuy.addEventListener('change', validateMonitorSettings);
    elements.monitorSell.addEventListener('change', validateMonitorSettings);

    // 添加设置自动保存事件监听器
    elements.tokenAddress.addEventListener('input', saveUserSettings);
    elements.buyPrice.addEventListener('input', saveUserSettings);
    elements.sellPrice.addEventListener('input', saveUserSettings);
    elements.buyAmount.addEventListener('input', saveUserSettings);
    elements.sellAmount.addEventListener('input', saveUserSettings);
    elements.buyTimes.addEventListener('input', saveUserSettings);
    elements.sellTimes.addEventListener('input', saveUserSettings);
    elements.monitorBuy.addEventListener('change', saveUserSettings);
    elements.monitorSell.addEventListener('change', saveUserSettings);
    elements.autoTrade.addEventListener('change', saveUserSettings);
    elements.checkInterval.addEventListener('input', saveUserSettings);
    elements.signalCooldown.addEventListener('input', saveUserSettings);
    elements.recipientAddress.addEventListener('input', saveUserSettings);
    elements.tipToken.addEventListener('change', saveUserSettings);
    elements.tipAmount.addEventListener('input', saveUserSettings);

    // 添加调试功能到全局作用域
    window.debugBuyTrigger = function() {
        console.log('🔧 手动触发买入测试');
        if (!currentTokenData) {
            console.log('❌ 没有代币数据');
            return;
        }
        const buyPrice = parseFloat(elements.buyPrice.value);
        const currentPrice = currentTokenData.price;
        console.log(`当前价格: $${currentPrice}, 买入价格: $${buyPrice}`);
        
        if (currentPrice <= buyPrice) {
            console.log('✅ 价格条件满足，手动触发买入');
            executeBuy(currentPrice, buyPrice);
        } else {
            console.log('❌ 价格条件不满足');
        }
    };
    
    window.resetBuyCount = function() {
        console.log('🔄 重置买入次数');
        buyCount = 0;
        lastBuySignalTime = 0;
        console.log('✅ 买入次数已重置');
    };
    
    window.forceStopMonitoring = function() {
        console.log('🛑 强制停止监控');
        stopMonitoring();
        console.log('✅ 监控已强制停止');
    };
    
    window.testMonitoringComplete = function() {
        console.log('🧪 测试监控完成逻辑');
        const monitorBuy = elements.monitorBuy.checked;
        const monitorSell = elements.monitorSell.checked;
        const buyTimes = parseInt(elements.buyTimes.value) || 1;
        const sellTimes = parseInt(elements.sellTimes.value) || 1;
        
        console.log(`当前状态: 买入${buyCount}/${buyTimes}, 卖出${sellCount}/${sellTimes}`);
        console.log(`监控设置: 买入${monitorBuy}, 卖出${monitorSell}`);
        
        // 模拟完成所有监控
        buyCount = buyTimes;
        sellCount = sellTimes;
        
        console.log('模拟完成所有监控任务');
        checkAndStopMonitoring();
    };

    // 添加清除设置功能
    window.clearUserSettings = clearUserSettings;

    // 回车键搜索
    elements.tokenAddress.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchToken();
        }
    });

    // 检查本地存储中是否已有钱包
    checkStoredWallet();
}

// 检查本地存储中的钱包（已移除localStorage功能）
function checkStoredWallet() {
    // 不再从localStorage读取钱包信息
    // 钱包信息只在内存中保存，页面刷新后需要重新导入
}

// 从文件读取钱包
async function importWalletFromFile() {
    const fileInput = document.getElementById('walletFileInput');
    const importButton = elements.importWalletFile;
    
    try {
        // 触发文件选择
        fileInput.click();
        
        // 监听文件选择事件
        fileInput.onchange = async function(event) {
            const file = event.target.files[0];
            if (!file) {
                showNotification('未选择文件', 'error');
                return;
            }

            try {
                importButton.innerHTML = '<span class="loading"></span> 导入中...';
                importButton.disabled = true;

                // 读取文件内容
                const fileContent = await readFileContent(file);

                // 尝试解析私钥
                let keypair;
                try {
                    // 首先尝试JSON格式
                    const walletData = JSON.parse(fileContent);
                    
                    // 检查是否是标准的Solana钱包格式
                    if (walletData.secretKey && Array.isArray(walletData.secretKey)) {
                        keypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));
                    } else if (Array.isArray(walletData) && walletData.length === 64) {
                        // 直接是私钥数组
                        keypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(walletData));
                    } else {
                        throw new Error('不支持的JSON格式');
                    }
                } catch (jsonError) {
                    // 如果JSON解析失败，尝试Base58格式
                    const privateKey = fileContent.trim();
                    const secretKey = manualBase58Decode(privateKey);
                    if (secretKey.length !== 64) {
                        throw new Error(`私钥长度不正确: 期望64字节，实际${secretKey.length}字节`);
                    }
                    keypair = solanaWeb3.Keypair.fromSecretKey(secretKey);
                }

                wallet = keypair;
                walletConnected = true;
                
                // 钱包信息只在内存中保存，不存储到localStorage

                console.log('钱包导入成功:', wallet.publicKey.toBase58());

                updateWalletStatus();
                showNotification('钱包从文件导入成功！', 'success');

            } catch (error) {
                console.error('文件导入失败:', error);
                showNotification('文件导入失败: ' + error.message, 'error');
            } finally {
                importButton.innerHTML = '从文件导入钱包';
                importButton.disabled = false;
                // 清空文件输入
                fileInput.value = '';
            }
        };
    } catch (error) {
        console.error('文件读取失败:', error);
        showNotification('文件读取失败: ' + error.message, 'error');
        importButton.innerHTML = '从文件导入钱包';
        importButton.disabled = false;
    }
}

// 读取文件内容
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(new Error('文件读取失败'));
        };
        reader.readAsText(file);
    });
}

// 更新打赏金额
function updateTipAmount() {
    const selectedToken = elements.tipToken.value;
    if (selectedToken === 'V2EX') {
        elements.tipAmount.value = '10';
    } else if (selectedToken === 'SOL') {
        elements.tipAmount.value = '0.002';
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
    const searchInput = elements.tokenAddress.value.trim();

    if (!searchInput) {
        showNotification('请输入代币地址或符号', 'error');
        return;
    }

    try {
        // 显示加载状态
        document.getElementById('tokenInfo').classList.add('hidden');
        document.getElementById('tokenEmpty').classList.add('hidden');
        document.getElementById('tokenLoading').classList.remove('hidden');
        
        elements.searchBtn.innerHTML = '<span class="loading"></span> 查询中...';
        elements.searchBtn.disabled = true;

        let tokenData = null;
        let tokenAddress = null;

        // 判断输入是地址还是符号
        if (isValidSolanaAddress(searchInput)) {
            // 输入的是地址，直接使用
            console.log('🔍 通过地址搜索代币:', searchInput);
            tokenAddress = searchInput;
        } else {
            // 输入的是符号，先搜索代币地址
            console.log('🔍 通过符号搜索代币:', searchInput);
            tokenAddress = await searchTokenBySymbol(searchInput);
            if (tokenAddress) {
                console.log('✅ 找到代币地址:', tokenAddress);
            } else {
                console.log('❌ 未找到代币或用户取消了选择:', searchInput);
                // 显示空状态
                document.getElementById('tokenLoading').classList.add('hidden');
                document.getElementById('tokenInfo').classList.add('hidden');
                document.getElementById('tokenEmpty').classList.remove('hidden');
                showNotification(`未找到代币: ${searchInput}`, 'error');
                return;
            }
        }

        // 使用找到的地址获取代币数据
        if (tokenAddress) {
            tokenData = await fetchTokenData(tokenAddress);
        }

        if (tokenData) {
            currentTokenData = tokenData;
            displayTokenInfo(tokenData);
            showNotification('代币信息获取成功', 'success');
            
            // 保存代币地址到localStorage
            localStorage.setItem(STORAGE_KEYS.TOKEN_ADDRESS, tokenAddress);
        } else {
            // 显示空状态
            document.getElementById('tokenLoading').classList.add('hidden');
            document.getElementById('tokenInfo').classList.add('hidden');
            document.getElementById('tokenEmpty').classList.remove('hidden');
            showNotification('无法获取代币信息', 'error');
        }
    } catch (error) {
        console.error('搜索代币错误:', error);
        // 显示空状态
        document.getElementById('tokenLoading').classList.add('hidden');
        document.getElementById('tokenInfo').classList.add('hidden');
        document.getElementById('tokenEmpty').classList.remove('hidden');
        showNotification('搜索代币时发生错误', 'error');
    } finally {
        elements.searchBtn.innerHTML = '查询';
        elements.searchBtn.disabled = false;
    }
}

// 通过符号搜索代币地址
async function searchTokenBySymbol(symbol) {
    try {
        console.log(`🔍 搜索代币符号: ${symbol}`);
        
        // 使用Phantom搜索API
        const searchUrl = `${HOSTURL}/search/v1?query=${encodeURIComponent(symbol)}&chainIds=solana:101&platform=extension&pageSize=10&searchTypes=fungible&searchContext=explore`;
        
        console.log(`🌐 搜索API: ${searchUrl}`);
        
        const response = await fetch(searchUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.error(`❌ 搜索API失败: ${response.status}`);
            return null;
        }

        const searchData = await response.json();
        console.log('📊 搜索结果:', searchData);

        if (searchData.results && searchData.results.length > 0) {
            // 如果只有一个结果，直接返回
            if (searchData.results.length === 1) {
                const firstResult = searchData.results[0];
                console.log('📋 单个搜索结果:', firstResult);
                
                const token = firstResult.data.data;
                console.log('✅ 找到代币数据:', token);
                
                // 检查代币地址
                if (token && token.mintAddress) {
                    console.log('📍 代币地址:', token.mintAddress);
                    
                    // 更新输入框显示找到的地址
                    elements.tokenAddress.value = token.mintAddress;
                    
                    return token.mintAddress;
                } else {
                    console.error('❌ 代币数据中没有地址信息:', token);
                    return null;
                }
            } else {
                // 多个结果，显示选择列表
                console.log(`📋 找到 ${searchData.results.length} 个搜索结果，显示选择列表`);
                return await showSearchResultsModal(searchData.results, symbol);
            }
        } else {
            console.log('❌ 未找到匹配的代币');
            return null;
        }
    } catch (error) {
        console.error('❌ 搜索代币符号失败:', error);
        return null;
    }
}

// 示例搜索函数
function searchExample(symbol) {
    console.log(`🔍 点击示例搜索: ${symbol}`);
    elements.tokenAddress.value = symbol;
    searchToken();
}

// 获取代币数据（真实API）
async function fetchTokenData(tokenAddress) {
    // 使用Phantom价格API获取代币数据
    let priceData = null;
    try {
        const priceRes = await fetch(`${HOSTURL}/price/v1/solana:101/address/${tokenAddress}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (priceRes.ok) {
            priceData = await priceRes.json();
        }
    } catch (e) {
        console.error('Phantom价格API失败:', e);
    }

    // 如果价格API失败，返回null
    if (!priceData || !priceData.price) {
        return null;
    }

    // 获取历史价格数据
    let historyData = null;
    try {
        const historyRes = await fetch(`${HOSTURL}/price-history/v1?token=solana:101/address:${tokenAddress}&type=1H`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (historyRes.ok) {
            historyData = await historyRes.json();
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

    return result;
}

// 显示代币信息
function displayTokenInfo(tokenData) {
    // 隐藏加载和空状态
    document.getElementById('tokenLoading').classList.add('hidden');
    document.getElementById('tokenEmpty').classList.add('hidden');
    
    // 设置代币基本信息
    if (tokenData.tokenInfo) {
        // 设置代币名称和符号
        document.getElementById('tokenName').textContent = tokenData.tokenInfo.name || 'Unknown Token';
        document.getElementById('tokenSymbol').textContent = tokenData.tokenInfo.symbol || '---';

        // 设置代币地址
        document.getElementById('tokenAddressDisplay').textContent = formatAddress(tokenData.address || elements.tokenAddress.value);

        // 设置代币图标
        const logoElement = document.getElementById('tokenLogo');
        if (tokenData.tokenInfo.logoUri) {
            logoElement.src = tokenData.tokenInfo.logoUri;
        } else {
            logoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMzIiIGZpbGw9IiNGMEYwRjAiLz4KPHBhdGggZD0iTTQyIDI4TDM0IDIwTDMwIDE2TDI0IDE2TDE4IDIwTDEwIDI4TDEwIDM2TDE4IDQ0TDI0IDQ4TDI4IDUyTDM0IDQ4TDM4IDQ0TDQ2IDM2TDQ2IDI4TDQyIDI4Wk0zOCAzNkwzNCAzMkwyOCAzMkwzMiAzNkwzOCAzNloiIHN0cm9rZT0iIzM0OTg5YiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';
        }

        // 设置市值信息
        if (tokenData.tokenInfo.marketCap) {
            document.getElementById('marketCap').textContent = formatCurrency(tokenData.tokenInfo.marketCap);
        } else {
            document.getElementById('marketCap').textContent = '-';
        }

        // 设置24小时交易量
        if (tokenData.tokenInfo.volume24hUsd) {
            document.getElementById('volume24h').textContent = formatCurrency(tokenData.tokenInfo.volume24hUsd);
        } else {
            document.getElementById('volume24h').textContent = '-';
        }


    }

    // 设置价格信息
    const priceValue = document.getElementById('currentPrice');
    priceValue.textContent = tokenData.price.toFixed(6);

    // 价格变化
    if (tokenData.priceChange24h !== undefined) {
        const change = tokenData.priceChange24h;
        const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        const changeElement = document.getElementById('priceChange24h');
        changeElement.textContent = changeText;
        changeElement.className = `change-indicator ${change >= 0 ? 'price-up' : 'price-down'}`;
    } else {
        document.getElementById('priceChange24h').textContent = '-';
    }

    // 最后更新时间
    if (tokenData.lastUpdatedAt) {
        const lastUpdated = new Date(tokenData.lastUpdatedAt);
        document.getElementById('lastUpdated').textContent = lastUpdated.toLocaleString('zh-CN');
    } else {
        document.getElementById('lastUpdated').textContent = '-';
    }

    // 显示代币信息模块
    document.getElementById('tokenInfo').classList.remove('hidden');

    // 初始化历史价格图表
    if (tokenData.historyData && tokenData.historyData.history) {
        initializeHistoryChart(tokenData.historyData.history);
    }
}

// 获取代币数据
async function fetchTokenData(tokenAddress) {
    // 获取代币基本信息
    let tokenInfo = null;
    try {
        const tokenRes = await fetch(`${HOSTURL}/search/v1?query=${tokenAddress}&chainIds=solana:101&platform=extension&pageSize=1&searchTypes=fungible&searchContext=explore`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.results && tokenData.results.length > 0) {
                tokenInfo = tokenData.results[0].data.data;
            }
        }
    } catch (e) {
        console.error('Phantom代币信息API失败:', e);
    }

    // 获取价格数据
    let priceData = null;
    try {
        const priceRes = await fetch(`${HOSTURL}/price/v1/solana:101/address/${tokenAddress}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (priceRes.ok) {
            priceData = await priceRes.json();
        }
    } catch (e) {
        console.error('Phantom价格API失败:', e);
    }

    // 如果价格API失败，返回null
    if (!priceData || !priceData.price) {
        return null;
    }

    // 获取历史价格数据
    let historyData = null;
    try {
        const historyRes = await fetch(`${HOSTURL}/price-history/v1?token=solana:101/address:${tokenAddress}&type=1H`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (historyRes.ok) {
            historyData = await historyRes.json();
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
        },
        tokenInfo: tokenInfo // 添加代币基本信息
    };

    return result;
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
}

// 更新图表时间范围
async function updateChartTimeRange() {
    if (!currentTokenData || !currentTokenData.address) {
        showNotification('请先查询代币信息', 'error');
        return;
    }

    const timeRange = elements.timeRange.value;

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
    console.log('🚀 开始启动价格监控...');
    
    const buyPrice = parseFloat(elements.buyPrice.value);
    const sellPrice = parseFloat(elements.sellPrice.value);
    const interval = parseInt(elements.checkInterval.value);
    const monitorBuy = elements.monitorBuy.checked;
    const monitorSell = elements.monitorSell.checked;
    const autoTrade = elements.autoTrade.checked;
    const userCooldown = parseInt(elements.signalCooldown.value) || 30; // 用户设置的冷却时间，默认30秒

    console.log(`📊 监控设置:`);
    console.log(`  - 买入价格: $${buyPrice}`);
    console.log(`  - 卖出价格: $${sellPrice}`);
    console.log(`  - 检查间隔: ${interval}秒`);
    console.log(`  - 监控买入: ${monitorBuy}`);
    console.log(`  - 监控卖出: ${monitorSell}`);
    console.log(`  - 自动交易: ${autoTrade}`);
    console.log(`  - 冷却时间: ${userCooldown}秒`);

    // 只有在选中自动交易时才要求连接钱包
    if (autoTrade && !walletConnected) {
        console.error('❌ 自动交易需要先导入钱包');
        showNotification('自动交易需要先导入钱包', 'error');
        return;
    }

    if (!currentTokenData) {
        console.error('❌ 请先查询代币信息');
        showNotification('请先查询代币信息', 'error');
        return;
    }

    // 验证监控设置
    if (!validateMonitorSettings()) {
        console.log('❌ 监控设置验证失败');
        return;
    }

    // 检查是否填写了必要的价格
    if (monitorBuy && !buyPrice) {
        console.error('❌ 请填写买入价格');
        showNotification('请填写买入价格', 'error');
        return;
    }

    if (monitorSell && !sellPrice) {
        console.error('❌ 请填写卖出价格');
        showNotification('请填写卖出价格', 'error');
        return;
    }

    if (!interval) {
        console.error('❌ 请填写检查频率');
        showNotification('请填写检查频率', 'error');
        return;
    }

    // 如果同时监控买入和卖出，检查价格关系
    if (monitorBuy && monitorSell && buyPrice >= sellPrice) {
        console.error('❌ 买入价格必须低于卖出价格');
        showNotification('买入价格必须低于卖出价格', 'error');
        return;
    }

    if (interval < 1) {
        console.error('❌ 检查频率不能少于2秒');
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

    // 重置计数器和冷却时间
    buyCount = 0;
    sellCount = 0;
    lastBuySignalTime = 0;
    lastSellSignalTime = 0;
    
    // 更新冷却时间设置
    sellSignalCooldown = userCooldown * 1000; // 转换为毫秒
    buySignalCooldown = userCooldown * 1000; // 转换为毫秒
    
    console.log(`🔄 重置计数器: 买入=${buyCount}, 卖出=${sellCount}`);
    console.log(`⏰ 设置冷却时间: ${userCooldown}秒`);
    
    // 启动统一的价格监控
    if (monitorBuy || monitorSell) {
        console.log(`🔄 启动统一价格监控，间隔: ${interval}秒`);
        priceMonitorInterval = setInterval(() => {
            console.log(`⏰ 价格监控定时器触发`);
            checkPriceAndExecute();
        }, interval * 1000);
    }

    // 更新UI状态
    updateMonitorUI();

    console.log('✅ 价格监控启动成功');
    showNotification('价格监控已启动', 'success');
}

// 停止监控
function stopMonitoring() {
    // 停止统一价格监控
    if (priceMonitorInterval) {
        clearInterval(priceMonitorInterval);
        priceMonitorInterval = null;
    }

    // 重置计数器和冷却时间
    buyCount = 0;
    sellCount = 0;
    lastBuySignalTime = 0;
    lastSellSignalTime = 0;

    // 更新UI状态
    updateMonitorUI();

    showNotification('价格监控已停止', 'success');
}

// 检查并停止监控函数
function checkAndStopMonitoring() {
    const monitorBuy = elements.monitorBuy.checked;
    const monitorSell = elements.monitorSell.checked;
    const buyTimes = parseInt(elements.buyTimes.value) || 1;
    const sellTimes = parseInt(elements.sellTimes.value) || 1;
    
    console.log(`🔍 检查监控状态:`);
    console.log(`  - 监控买入: ${monitorBuy}, 买入次数: ${buyCount}/${buyTimes}`);
    console.log(`  - 监控卖出: ${monitorSell}, 卖出次数: ${sellCount}/${sellTimes}`);
    
    // 检查是否所有启用的监控都已完成
    const buyCompleted = !monitorBuy || buyCount >= buyTimes;
    const sellCompleted = !monitorSell || sellCount >= sellTimes;
    
    console.log(`  - 买入完成: ${buyCompleted}`);
    console.log(`  - 卖出完成: ${sellCompleted}`);
    
    if (buyCompleted && sellCompleted) {
        console.log(`✅ 所有监控任务已完成，停止监控`);
        showNotification('所有监控任务已完成，监控已停止', 'success');
        stopMonitoring();
    } else {
        console.log(`⏳ 还有监控任务未完成，继续监控`);
    }
}

// 调试函数：打印当前监控状态
function debugMonitorStatus() {
    console.log(`🔍 当前监控状态调试信息:`);
    console.log(`  - 监控间隔: ${priceMonitorInterval ? '运行中' : '已停止'}`);
    console.log(`  - 当前代币: ${currentTokenData ? currentTokenData.symbol : '无'}`);
    console.log(`  - 钱包连接: ${walletConnected}`);
    console.log(`  - 自动交易: ${elements.autoTrade.checked}`);
    console.log(`  - 监控买入: ${elements.monitorBuy.checked}`);
    console.log(`  - 监控卖出: ${elements.monitorSell.checked}`);
    console.log(`  - 买入价格: ${elements.buyPrice.value}`);
    console.log(`  - 卖出价格: ${elements.sellPrice.value}`);
    console.log(`  - 买入次数: ${buyCount}/${elements.buyTimes.value}`);
    console.log(`  - 卖出次数: ${sellCount}/${elements.sellTimes.value}`);
    console.log(`  - 冷却时间: ${elements.signalCooldown.value}秒`);
    console.log(`  - 检查间隔: ${elements.checkInterval.value}秒`);
    console.log(`  - 上次买入信号: ${new Date(lastBuySignalTime).toLocaleString()}`);
    console.log(`  - 上次卖出信号: ${new Date(lastSellSignalTime).toLocaleString()}`);
}

// 检查价格（通用函数）
async function checkPrice() {
    if (!currentTokenData) {
        console.log('❌ checkPrice失败: 没有代币数据');
        return;
    }
    
    // 获取最新价格
    let newPrice = currentTokenData.price;
    let priceUpdated = false;

    console.log(`🔍 开始获取最新价格，代币地址: ${currentTokenData.address}`);

    try {
        // 使用Phantom价格API获取最新价格
        if (currentTokenData.address) {
            const apiUrl = `${HOSTURL}/price/v1/solana:101/address/${currentTokenData.address}`;
            console.log(`🌐 请求API: ${apiUrl}`);
            
            const phantomRes = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            console.log(`📡 API响应状态: ${phantomRes.status}`);

            if (phantomRes.ok) {
                const phantomData = await phantomRes.json();
                console.log(`📊 API返回数据:`, phantomData);
                
                if (phantomData && phantomData.price) {
                    newPrice = phantomData.price;
                    currentTokenData.price = newPrice;
                    priceUpdated = true;
                    console.log(`✅ 价格更新成功: $${newPrice.toFixed(6)}`);
                } else {
                    console.log(`❌ API返回数据中没有价格信息`);
                }
            } else {
                console.log(`❌ API请求失败: ${phantomRes.status} ${phantomRes.statusText}`);
            }
        }
    } catch (e) {
        console.error('❌ 获取最新价格失败:', e);
    }

    // 如果Phantom API失败，停止监控
    if (!priceUpdated) {
        console.log('❌ 价格更新失败，停止监控');
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

    console.log(`✅ 价格检查完成: $${newPrice.toFixed(6)}`);
    return newPrice;
}



// 统一的价格检查和执行函数
async function checkPriceAndExecute() {
    if (!currentTokenData) {
        console.log('❌ 检查价格失败: 没有代币数据');
        return;
    }
    
    // 添加调试信息
    debugMonitorStatus();
    
    const newPrice = await checkPrice();
    if (!newPrice) {
        console.log('❌ 检查价格失败: 无法获取最新价格');
        return;
    }

    const autoTrade = elements.autoTrade.checked;
    const buyPrice = parseFloat(elements.buyPrice.value);
    const sellPrice = parseFloat(elements.sellPrice.value);
    const buyTimes = parseInt(elements.buyTimes.value) || 1;
    const sellTimes = parseInt(elements.sellTimes.value) || 1;
    const monitorBuy = elements.monitorBuy.checked;
    const monitorSell = elements.monitorSell.checked;

    console.log(`🔍 价格检查 - 当前价格: $${newPrice.toFixed(6)}`);
    console.log(`  - 买入价格: $${buyPrice}, 买入次数: ${buyCount}/${buyTimes}, 监控买入: ${monitorBuy}`);
    console.log(`  - 卖出价格: $${sellPrice}, 卖出次数: ${sellCount}/${sellTimes}, 监控卖出: ${monitorSell}`);

    // 优先检查买入条件
    console.log(`🔍 详细买入条件检查:`);
    console.log(`  - monitorBuy: ${monitorBuy}`);
    console.log(`  - buyPrice: ${buyPrice}`);
    console.log(`  - newPrice: ${newPrice}`);
    console.log(`  - buyCount: ${buyCount}`);
    console.log(`  - buyTimes: ${buyTimes}`);
    console.log(`  - 价格条件: ${newPrice} <= ${buyPrice} = ${newPrice <= buyPrice}`);
    console.log(`  - 次数条件: ${buyCount} < ${buyTimes} = ${buyCount < buyTimes}`);
    
    if (monitorBuy && buyPrice && newPrice <= buyPrice && buyCount < buyTimes) {
        console.log(`✅ 买入条件满足! 当前价格 $${newPrice.toFixed(6)} <= 买入价格 $${buyPrice}`);
        
        // 检查冷却期
        const now = Date.now();
        console.log(`⏰ 冷却检查: 当前时间 ${now}, 上次信号时间 ${lastBuySignalTime}, 冷却时间 ${buySignalCooldown}`);
        if (now - lastBuySignalTime < buySignalCooldown) {
            const remainingCooldown = Math.ceil((buySignalCooldown - (now - lastBuySignalTime)) / 1000);
            console.log(`⏳ 买入冷却中，剩余 ${remainingCooldown} 秒`);
            return;
        }

        const message = `买入信号！当前价格 $${newPrice.toFixed(6)} 低于买入价格 $${buyPrice}`;
        console.log(`🚀 触发买入信号: ${message}`);
        
        // 更新上次信号时间
        lastBuySignalTime = now;

        if (autoTrade) {
            // 自动买入逻辑
            try {
                console.log('🤖 开始自动买入...');
                await executeBuy(newPrice, buyPrice);
                buyCount++;
                console.log(`✅ 买入成功，当前买入次数: ${buyCount}/${buyTimes}`);
                
                // 只在交易成功时发送通知
                showNotification(`自动买入执行完成 (${buyCount}/${buyTimes})`, 'success');
                
                // 检查是否达到买入次数限制
                if (buyCount >= buyTimes) {
                    console.log(`✅ 已完成 ${buyTimes} 次买入，停止买入监控`);
                    showNotification(`已完成 ${buyTimes} 次买入，停止买入监控`, 'success');
                    
                    // 检查是否所有监控都已完成
                    checkAndStopMonitoring();
                }
            } catch (error) {
                console.error('自动买入失败:', error);
                showNotification(`自动买入失败: ${error.message}`, 'error');
            }
        } else {
            // 只在非自动交易时发送浏览器通知
            console.log('📢 发送买入通知');
            sendBrowserNotification(
                '买入信号提醒',
                message,
                '/favicon.ico'
            );
            
            // 非自动交易时也要增加计数
            buyCount++;
            console.log(`✅ 买入通知已发送，当前买入次数: ${buyCount}/${buyTimes}`);
            
            // 检查是否达到买入次数限制
            if (buyCount >= buyTimes) {
                console.log(`✅ 已完成 ${buyTimes} 次买入通知，停止买入监控`);
                showNotification(`已完成 ${buyTimes} 次买入通知，停止买入监控`, 'success');
                
                // 检查是否所有监控都已完成
                checkAndStopMonitoring();
            }
        }
        
        // 更新UI状态
        updateMonitorUI();
        return; // 买入执行后不再检查卖出
    }

    // 如果买入条件不满足或已达到买入次数限制，检查卖出条件
    if (monitorSell && sellPrice && newPrice >= sellPrice && sellCount < sellTimes) {
        console.log(`✅ 卖出条件满足! 当前价格 $${newPrice.toFixed(6)} >= 卖出价格 $${sellPrice}`);
        
        // 检查冷却期
        const now = Date.now();
        if (now - lastSellSignalTime < sellSignalCooldown) {
            const remainingCooldown = Math.ceil((sellSignalCooldown - (now - lastSellSignalTime)) / 1000);
            console.log(`⏳ 卖出冷却中，剩余 ${remainingCooldown} 秒`);
            return;
        }

        const message = `卖出信号！当前价格 $${newPrice.toFixed(6)} 高于卖出价格 $${sellPrice}`;
        console.log(`🚀 触发卖出信号: ${message}`);
        
        // 更新上次信号时间
        lastSellSignalTime = now;

        if (autoTrade) {
            // 自动卖出逻辑
            try {
                console.log('🤖 开始自动卖出...');
                executeSell(newPrice, sellPrice);
                sellCount++;
                
                // 只在交易成功时发送通知
                showNotification(`自动卖出执行完成 (${sellCount}/${sellTimes})`, 'success');
                
                // 检查是否达到卖出次数限制
                if (sellCount >= sellTimes) {
                    console.log(`✅ 已完成 ${sellTimes} 次卖出，停止卖出监控`);
                    showNotification(`已完成 ${sellTimes} 次卖出，停止卖出监控`, 'success');
                    
                    // 检查是否所有监控都已完成
                    checkAndStopMonitoring();
                }
            } catch (error) {
                console.error('自动卖出失败:', error);
                showNotification(`自动卖出失败: ${error.message}`, 'error');
            }
        } else {
            // 只在非自动交易时发送浏览器通知
            console.log('📢 发送卖出通知');
            sendBrowserNotification(
                '卖出信号提醒',
                message,
                '/favicon.ico'
            );
            
            // 非自动交易时也要增加计数
            sellCount++;
            console.log(`✅ 卖出通知已发送，当前卖出次数: ${sellCount}/${sellTimes}`);
            
            // 检查是否达到卖出次数限制
            if (sellCount >= sellTimes) {
                console.log(`✅ 已完成 ${sellTimes} 次卖出通知，停止卖出监控`);
                showNotification(`已完成 ${sellTimes} 次卖出通知，停止卖出监控`, 'success');
                
                // 检查是否所有监控都已完成
                checkAndStopMonitoring();
            }
        }
    } else {
        console.log(`❌ 价格条件不满足:`);
        if (monitorBuy) {
            console.log(`  - 买入: 当前价格 $${newPrice.toFixed(6)} > 买入价格 $${buyPrice} 或已达到次数限制 ${buyCount}/${buyTimes}`);
        }
        if (monitorSell) {
            console.log(`  - 卖出: 当前价格 $${newPrice.toFixed(6)} < 卖出价格 $${sellPrice} 或已达到次数限制 ${sellCount}/${sellTimes}`);
        }
    }
    
    // 更新UI状态
    updateMonitorUI();
}



// 更新监控UI状态
function updateMonitorUI() {
    const isMonitoring = priceMonitorInterval !== null;
    
    if (isMonitoring) {
        elements.startMonitor.classList.add('hidden');
        elements.stopMonitor.classList.remove('hidden');
        elements.monitorStatus.classList.remove('hidden');
        
        const monitorBuy = elements.monitorBuy.checked;
        const monitorSell = elements.monitorSell.checked;
        const buyTimes = parseInt(elements.buyTimes.value) || 1;
        const sellTimes = parseInt(elements.sellTimes.value) || 1;
        let statusText = '价格监控中...';
        
        if (monitorBuy && monitorSell) {
            statusText = `买入&卖出监控中... (买入:${buyCount}/${buyTimes} 卖出:${sellCount}/${sellTimes})`;
        } else if (monitorBuy) {
            statusText = `买入监控中... (${buyCount}/${buyTimes})`;
        } else if (monitorSell) {
            statusText = `卖出监控中... (${sellCount}/${sellTimes})`;
        }
        
        elements.statusText.textContent = statusText;
    } else {
        elements.startMonitor.classList.remove('hidden');
        elements.stopMonitor.classList.add('hidden');
        elements.monitorStatus.classList.add('hidden');
    }
}

// 停止买入监控
function stopBuyMonitoring() {
    // 由于现在使用统一监控，这里只是标记买入已完成
    console.log('✅ 买入监控已完成，不再执行买入操作');
    showNotification('买入监控已完成', 'success');
}

// 停止卖出监控
function stopSellMonitoring() {
    // 由于现在使用统一监控，这里只是标记卖出已完成
    console.log('✅ 卖出监控已完成，不再执行卖出操作');
    showNotification('卖出监控已完成', 'success');
}

// 自动买入功能
async function executeBuy(currentPrice, targetPrice) {
    if (!walletConnected || !wallet) {
        throw new Error('钱包未连接');
    }

    try {
        // 获取用户设置的买入数量
        const buyAmount = parseFloat(elements.buyAmount.value) || 0.01; // 默认买入0.01 SOL worth的代币

        // 使用Jupiter API获取交易报价
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${currentTokenData.address}&amount=${buyAmount * LAMPORTS_PER_SOL}&slippageBps=50`;
        
        const quoteResponse = await fetch(quoteUrl);

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
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true
            })
        });

        if (!swapResponse.ok) {
            throw new Error('无法创建交易');
        }

        const swapData = await swapResponse.json();

        // 使用导入的钱包签名并发送交易
        const transactionBuf = Uint8Array.from(atob(swapData.swapTransaction), c => c.charCodeAt(0));
        const transaction = solanaWeb3.VersionedTransaction.deserialize(transactionBuf);
        
        // 使用导入的钱包签名交易
        transaction.sign([wallet]);
        
        // 使用更好的RPC节点
        const connection = new solanaWeb3.Connection(RPC_NODE, 'confirmed');
        
        try {
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            });

            // 等待交易确认，增加超时时间
            const confirmation = await connection.confirmTransaction(signature, 'confirmed', {
                commitment: 'confirmed',
                timeout: 60000 // 60秒超时
            });
            
            if (confirmation.value.err) {
                throw new Error(`交易失败: ${confirmation.value.err}`);
            }

            showNotification(`买入交易成功，交易签名: ${signature.slice(0, 8)}...`, 'success');
            
            // 发送浏览器通知
            const notificationBuyAmount = parseFloat(elements.buyAmount.value) || 0.01;
            sendBrowserNotification(
                '买入交易成功',
                `买入交易已完成！\n\n💰 买入数量: ${notificationBuyAmount} SOL\n💵 价格: $${currentPrice.toFixed(6)}\n🔗 交易签名: ${signature.slice(0, 8)}...\n\n点击查看交易详情`,
                '/favicon.ico'
            );
        } catch (rpcError) {
            console.error('❌ RPC错误:', rpcError);
        }

    } catch (error) {
        console.error('❌ 买入执行失败:', error);
        
        // 提供更详细的错误信息
        if (error.message.includes('403')) {
            throw new Error('RPC节点访问被拒绝，请稍后重试或检查网络连接');
        } else if (error.message.includes('429')) {
            throw new Error('请求过于频繁，请稍后重试');
        } else if (error.message.includes('insufficient funds')) {
            throw new Error('钱包余额不足，请检查SOL余额');
        } else if (error.message.includes('slippage')) {
            throw new Error('滑点过大，交易失败，请调整滑点设置');
        } else {
            throw new Error(`买入失败: ${error.message}`);
        }
    }
}

// 自动卖出功能
async function executeSell(currentPrice, targetPrice) {
    if (!walletConnected || !wallet) {
        throw new Error('钱包未连接');
    }

    try {
        // 获取用户设置的卖出数量
        const sellAmount = parseFloat(elements.sellAmount.value) || 100; // 默认卖出100个代币

        // 使用Jupiter API获取交易报价
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${currentTokenData.address}&outputMint=So11111111111111111111111111111111111111112&amount=${sellAmount * 1000000}&slippageBps=50`;
        
        const quoteResponse = await fetch(quoteUrl);

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
                userPublicKey: wallet.publicKey.toString(), // 使用导入的钱包公钥
                wrapAndUnwrapSol: true
            })
        });

        if (!swapResponse.ok) {
            throw new Error('无法创建交易');
        }

        const swapData = await swapResponse.json();

        // 使用导入的钱包签名并发送交易
        const transactionBuf = Uint8Array.from(atob(swapData.swapTransaction), c => c.charCodeAt(0));
        const transaction = solanaWeb3.VersionedTransaction.deserialize(transactionBuf);
        
        // 使用导入的钱包签名交易
        transaction.sign([wallet]);
        
        // 使用更好的RPC节点
        const connection = new solanaWeb3.Connection(RPC_NODE, 'confirmed');
        
        try {
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            });

            // 等待交易确认，增加超时时间
            const confirmation = await connection.confirmTransaction(signature, 'confirmed', {
                commitment: 'confirmed',
                timeout: 60000 // 60秒超时
            });
            
            if (confirmation.value.err) {
                throw new Error(`交易失败: ${confirmation.value.err}`);
            }

            showNotification(`卖出交易成功，交易签名: ${signature.slice(0, 8)}...`, 'success');
            
            // 发送浏览器通知
            const notificationSellAmount = parseFloat(elements.sellAmount.value) || 100;
            sendBrowserNotification(
                '卖出交易成功',
                `卖出交易已完成！\n\n💰 卖出数量: ${notificationSellAmount} 代币\n💵 价格: $${currentPrice.toFixed(6)}\n🔗 交易签名: ${signature.slice(0, 8)}...\n\n点击查看交易详情`,
                '/favicon.ico'
            );
        } catch (rpcError) {
            console.error('❌ RPC错误:', rpcError);
        }
    } catch (error) {
        console.error('❌ 卖出执行失败:', error);
        
        // 提供更详细的错误信息
        if (error.message.includes('403')) {
            throw new Error('RPC节点访问被拒绝，请稍后重试或检查网络连接');
        } else if (error.message.includes('429')) {
            throw new Error('请求过于频繁，请稍后重试');
        } else if (error.message.includes('insufficient funds')) {
            throw new Error('代币余额不足，请检查代币余额');
        } else if (error.message.includes('slippage')) {
            throw new Error('滑点过大，交易失败，请调整滑点设置');
        } else {
            throw new Error(`卖出失败: ${error.message}`);
        }
    }
}

// 导入钱包功能
// 导入钱包功能
async function importWallet() {
    try {
        // 创建一个模态框让用户输入私钥
        const privateKey = prompt("请输入您的私钥 (base58格式):");
        
        if (!privateKey) {
            showNotification('私钥输入已取消', 'error');
            return;
        }

        elements.connectWallet.innerHTML = '<span class="loading"></span> 导入中...';
        elements.connectWallet.disabled = true;

        // 尝试从私钥创建钱包
        let keypair;
        
        try {
            // 首先尝试JSON数组格式
            try {
                const secretKeyArray = JSON.parse(privateKey);
                if (Array.isArray(secretKeyArray) && secretKeyArray.length === 64) {
                    keypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
                } else {
                    throw new Error('不是有效的JSON数组格式或长度不正确');
                }
            } catch (jsonError) {
                // 如果JSON解析失败，尝试手动Base58解码
                const secretKey = manualBase58Decode(privateKey);
                if (secretKey.length !== 64) {
                    throw new Error(`私钥长度不正确: 期望64字节，实际${secretKey.length}字节`);
                }
                keypair = solanaWeb3.Keypair.fromSecretKey(secretKey);
            }
        } catch (error) {
            throw new Error('无效的私钥格式。支持的格式：Base58编码的64字节私钥 或 包含64个数字的JSON数组。错误详情: ' + error.message);
        }

        wallet = keypair;
        walletConnected = true;
        
        console.log('钱包导入成功:', wallet.publicKey.toBase58());
        
        updateWalletStatus();
        showNotification('钱包导入成功！', 'success');

    } catch (error) {
        console.error('钱包导入失败:', error);
        showNotification('钱包导入失败: ' + error.message, 'error');
        // 导入失败时重置按钮状态
        elements.connectWallet.innerHTML = '导入钱包';
        elements.connectWallet.disabled = false;
        elements.connectWallet.classList.add('btn-wallet-connect');
        elements.connectWallet.classList.remove('btn-secondary');
    }
}

// 手动实现Base58解码
function manualBase58Decode(encoded) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = 58;
    
    if (encoded.length === 0) {
        return new Uint8Array(0);
    }
    
    // 计算前导1的数量（代表前导零字节）
    let leadingZeros = 0;
    while (leadingZeros < encoded.length && encoded[leadingZeros] === '1') {
        leadingZeros++;
    }
    
    // 分配足够的空间来存储结果
    const bytes = new Uint8Array(encoded.length);
    let length = 0;
    
    // 处理每个字符
    for (let i = leadingZeros; i < encoded.length; i++) {
        // 查找字符在字母表中的位置
        const charIndex = ALPHABET.indexOf(encoded[i]);
        if (charIndex === -1) {
            throw new Error('无效的Base58字符');
        }
        
        // 将字符值加到结果中
        let carry = charIndex;
        for (let j = 0; j < length; j++) {
            carry += bytes[j] * BASE;
            bytes[j] = carry % 256;
            carry = Math.floor(carry / 256);
        }
        
        while (carry > 0) {
            bytes[length] = carry % 256;
            carry = Math.floor(carry / 256);
            length++;
        }
    }
    
    // 构造最终结果
    const result = new Uint8Array(leadingZeros + length);
    for (let i = 0; i < length; i++) {
        result[leadingZeros + i] = bytes[length - 1 - i];
    }
    
    return result;
}

// 更新钱包状态显示
function updateWalletStatus() {
    const walletInfoDisplay = document.getElementById('walletInfoDisplay');
    const walletPublicKey = document.getElementById('walletPublicKey');
    
    if (walletConnected) {
        // 显示钱包信息
        walletInfoDisplay.classList.remove('hidden');
        walletPublicKey.textContent = wallet.publicKey.toBase58();
        
        // 更新按钮状态
        elements.sendTip.disabled = false;
        elements.connectWallet.innerHTML = '已导入钱包';
        elements.connectWallet.disabled = true;
        elements.connectWallet.classList.add('btn-success');
        elements.connectWallet.classList.remove('btn-secondary', 'btn-wallet-connect');
        elements.showWalletInfo.classList.remove('hidden'); 
    } else {
        // 隐藏钱包信息
        walletInfoDisplay.classList.add('hidden');
        walletPublicKey.textContent = '-';
        
        // 更新按钮状态
        elements.sendTip.disabled = true;
        elements.connectWallet.innerHTML = '导入钱包';
        elements.connectWallet.disabled = false;
        elements.connectWallet.classList.remove('btn-success');
        elements.connectWallet.classList.add('btn-wallet-connect');
        elements.connectWallet.classList.remove('btn-secondary');
        elements.showWalletInfo.classList.add('hidden');
    }
}

// 发送打赏
async function sendTip() {
    if (!walletConnected) {
        showNotification('请先导入钱包', 'error');
        return;
    }

    let recipientAddress = elements.recipientAddress.value.trim();
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

    try {
        // 解析.sol域名
        recipientAddress = await resolveSolDomain(recipientAddress);

        // 验证Solana地址格式
        if (!isValidSolanaAddress(recipientAddress)) {
            showNotification('请输入有效的Solana地址', 'error');
            return;
        }

        elements.sendTip.innerHTML = '<span class="loading"></span> 发送中...';
        elements.sendTip.disabled = true;

        let signature;

        if (tipToken === 'SOL') {
            // 发送SOL
            try {
                // 创建连接到Solana网络
                const connection = new solanaWeb3.Connection(RPC_NODE);

                // 获取最新的blockhash
                const { blockhash } = await connection.getLatestBlockhash();

                // 创建交易
                const transaction = new solanaWeb3.Transaction({
                    recentBlockhash: blockhash,
                    feePayer: wallet.publicKey // 使用导入的钱包公钥
                });

                // 创建转账指令
                const instruction = solanaWeb3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey, // 使用导入的钱包公钥
                    toPubkey: new solanaWeb3.PublicKey(recipientAddress),
                    lamports: tipAmount * LAMPORTS_PER_SOL
                });

                // 添加指令到交易
                transaction.add(instruction);

                // 使用导入的钱包签名交易
                transaction.sign(wallet);

                // 发送交易
                signature = await connection.sendRawTransaction(transaction.serialize());

                console.log('SOL转账成功:', signature);

            } catch (error) {
                console.error('SOL转账失败:', error);
                throw new Error('SOL转账失败: ' + error.message);
            }

        } else if (tipToken === 'V2EX') {
            // 发送V2EX代币
            try {
                // 创建连接到Solana网络
                const connection = new solanaWeb3.Connection(RPC_NODE);

                // 获取发送方关联代币账户地址
                let fromATA = await getAssociatedTokenAddress(wallet.publicKey, new solanaWeb3.PublicKey(V2EX_TOKEN_MINT), rpcUrl);

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
                            wallet.publicKey // 使用导入的钱包公钥
                        ),
                        wallet.publicKey, // 使用导入的钱包公钥
                        wallet.publicKey // 使用导入的钱包公钥
                    );

                    const createFromATATransaction = new solanaWeb3.Transaction();
                    createFromATATransaction.add(createFromATAInstruction);

                    const { blockhash: createFromATABlockhash } = await connection.getLatestBlockhash();
                    createFromATATransaction.recentBlockhash = createFromATABlockhash;
                    createFromATATransaction.feePayer = wallet.publicKey; // 使用导入的钱包公钥

                    // 使用导入的钱包签名交易
                    createFromATATransaction.sign(wallet);

                    // 发送创建账户的交易
                    signature = await connection.sendRawTransaction(createFromATATransaction.serialize());
                    console.log('创建发送方V2EX关联账户成功:', signature);

                    // 等待交易确认
                    await connection.confirmTransaction(signature, 'confirmed');

                    // 重新获取账户地址
                    fromATA = await getAssociatedTokenAddress(wallet.publicKey, new solanaWeb3.PublicKey(V2EX_TOKEN_MINT), rpcUrl);
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
                        wallet.publicKey // 使用导入的钱包公钥
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
                        { pubkey: wallet.publicKey, isSigner: true, isWritable: false } // 使用导入的钱包公钥
                    ],
                    programId: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
                    data: transferInstructionData
                });

                transaction.add(transferInstruction);

                // 获取最新的blockhash
                const { blockhash } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = wallet.publicKey; // 使用导入的钱包公钥

                // 使用导入的钱包签名交易
                transaction.sign(wallet);

                // 发送交易
                signature = await connection.sendRawTransaction(transaction.serialize());

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
            errorMessage = '请检查钱包并确认交易';
        } else {
            errorMessage = error.message || '未知错误';
        }

        elements.tipMessage.textContent = errorMessage;
        elements.tipStatus.classList.add('error');
        elements.tipStatus.classList.remove('hidden');
        showNotification(`${tipToken}打赏发送失败: ${errorMessage}`, 'error');
    } finally {
        elements.sendTip.innerHTML = '测试自动交易';
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

async function showWalletInfo() {
    if (!walletConnected || !wallet) {
        showNotification('请先导入钱包', 'error');
        return;
    }
    
    try {
        // 显示模态框
        const modal = document.getElementById('walletInfoModal');
        modal.classList.remove('hidden');
        
        // 填充基本信息
        const base58Address = wallet.publicKey.toBase58();
        document.getElementById('modalPublicKey').textContent = base58Address;
        document.getElementById('modalAddressLength').textContent = `${base58Address.length} 字符`;
        document.getElementById('modalConnectionStatus').textContent = '已连接';
        document.getElementById('modalConnectionStatus').className = 'info-value connected';
        
        // 获取SOL余额
        try {
            const connection = new solanaWeb3.Connection(RPC_NODE);
            const balance = await connection.getBalance(wallet.publicKey);
            const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(6);
            document.getElementById('modalSolBalance').textContent = `${solBalance} SOL`;
        } catch (error) {
            console.error('获取SOL余额失败:', error);
            document.getElementById('modalSolBalance').textContent = '获取失败';
        }
        
        // 获取代币账户数量
        try {
            const connection = new solanaWeb3.Connection(RPC_NODE);
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
                programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
            });
            document.getElementById('modalTokenAccounts').textContent = `${tokenAccounts.value.length} 个`;
        } catch (error) {
            console.error('获取代币账户失败:', error);
            document.getElementById('modalTokenAccounts').textContent = '获取失败';
        }
        
        // 网络信息
        document.getElementById('modalNetwork').textContent = 'Solana Mainnet';
        document.getElementById('modalRpcNode').textContent = RPC_NODE;
        
        // 添加关闭事件
        const closeModal = () => {
            closeWalletInfoModal();
        };
        
        // 点击模态框背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEsc);
        
    } catch (error) {
        console.error('显示钱包信息失败:', error);
        showNotification('显示钱包信息失败', 'error');
    }
}

function closeWalletInfoModal() {
    const modal = document.getElementById('walletInfoModal');
    modal.classList.add('hidden');
}


// 工具函数：格式化地址
function formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

// 格式化货币显示
function formatCurrency(amount) {
    if (!amount || amount === 0) return '-';
    
    if (amount >= 1e9) {
        return `$${(amount / 1e9).toFixed(2)}B`;
    } else if (amount >= 1e6) {
        return `$${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
        return `$${(amount / 1e3).toFixed(2)}K`;
    } else {
        return `$${amount.toFixed(2)}`;
    }
}

// 格式化数字显示
function formatNumber(amount) {
    if (!amount || amount === 0) return '-';
    
    if (amount >= 1e9) {
        return `${(amount / 1e9).toFixed(2)}B`;
    } else if (amount >= 1e6) {
        return `${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
        return `${(amount / 1e3).toFixed(2)}K`;
    } else {
        return amount.toLocaleString();
    }
}

// 工具函数：验证Solana地址
function isValidSolanaAddress(address) {
    console.log(`🔍 验证地址: ${address}`);
    
    if (!address) {
        console.log('❌ 地址为空');
        return false;
    }
    
    if (address.endsWith('.sol')) {
        console.log('✅ 是.sol域名');
        return true;
    }
    
    const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    console.log(`🔍 地址格式验证: ${isValid} (长度: ${address.length})`);
    
    return isValid;
}

// 添加域名解析函数
async function resolveSolDomain(address) {
    if (address.endsWith('.sol')) {
        try {
            // 使用Solana名称服务API解析域名
            const response = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${address}`);
            const data = await response.json();
            if (data.result) {
                return data.result;
            } else {
                throw new Error('域名解析失败');
            }
        } catch (error) {
            console.error('域名解析错误:', error);
            throw new Error(`域名解析失败: ${error.message}`);
        }
    }
    return address;
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
            requireInteraction: true,
            badge: '/favicon.ico',
            tag: 'trading-notification',
            silent: false
        });
    }
}


// 页面卸载时清理
window.addEventListener('beforeunload', function () {
    if (priceMonitorInterval) {
        clearInterval(priceMonitorInterval);
    }
});

// 显示搜索结果选择模态框
async function showSearchResultsModal(searchResults, searchSymbol) {
    return new Promise((resolve) => {
        const modal = document.getElementById('searchResultsModal');
        const resultsList = document.getElementById('searchResultsList');
        
        // 清空现有结果
        resultsList.innerHTML = '';
        
        // 为每个搜索结果创建选项
        searchResults.forEach((result, index) => {
            const token = result.data.data;
            if (!token || !token.mintAddress) return;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.index = index;
            resultItem.dataset.address = token.mintAddress;
            
            // 获取代币图标
            const iconUrl = token.logoUri || '';
            const iconElement = iconUrl ? 
                `<img src="${iconUrl}" alt="Token Icon" class="search-result-icon" onerror="this.style.display='none'">` :
                `<div class="search-result-icon">🪙</div>`;
            
            // 获取价格信息
            let priceInfo = '';
            if (token.price) {
                const priceChange = token.priceChange24h || 0;
                const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';
                const priceChangeText = priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
                
                priceInfo = `
                    <div class="search-result-price">
                        <div class="search-result-price-value">$${token.price.toFixed(6)}</div>
                        <div class="search-result-price-change ${priceChangeClass}">${priceChangeText}</div>
                    </div>
                `;
            }
            
            resultItem.innerHTML = `
                ${iconElement}
                <div class="search-result-info">
                    <div class="search-result-name">${token.name || 'Unknown Token'}</div>
                    <div class="search-result-symbol">${token.symbol || '---'}</div>
                    <div class="search-result-address">${formatAddress(token.mintAddress)}</div>
                </div>
                ${priceInfo}
            `;
            
            // 添加点击事件
            resultItem.addEventListener('click', () => {
                // 移除其他选中状态
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // 添加选中状态
                resultItem.classList.add('selected');
                
                // 更新输入框
                elements.tokenAddress.value = token.mintAddress;
                
                // 关闭模态框
                closeSearchResultsModal();
                
                // 返回选中的地址
                resolve(token.mintAddress);
            });
            
            resultsList.appendChild(resultItem);
        });
        
        // 显示模态框
        modal.classList.remove('hidden');
        
        // 添加关闭事件
        const closeModal = () => {
            closeSearchResultsModal();
            resolve(null);
        };
        
        // 点击模态框背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // 存储关闭函数，以便在closeSearchResultsModal中调用
        modal._closeFunction = closeModal;
    });
}

// 关闭搜索结果模态框
function closeSearchResultsModal() {
    const modal = document.getElementById('searchResultsModal');
    modal.classList.add('hidden');
    
    // 移除事件监听器
    if (modal._closeFunction) {
        document.removeEventListener('keydown', modal._closeFunction);
        delete modal._closeFunction;
    }
}

// 将函数暴露到全局作用域，以便HTML中的onclick能正常工作
window.closeSearchResultsModal = closeSearchResultsModal;

// localStorage 相关函数
function saveUserSettings() {
    try {
        const settings = {
            [STORAGE_KEYS.TOKEN_ADDRESS]: elements.tokenAddress.value,
            [STORAGE_KEYS.BUY_PRICE]: elements.buyPrice.value,
            [STORAGE_KEYS.SELL_PRICE]: elements.sellPrice.value,
            [STORAGE_KEYS.BUY_AMOUNT]: elements.buyAmount.value,
            [STORAGE_KEYS.SELL_AMOUNT]: elements.sellAmount.value,
            [STORAGE_KEYS.BUY_TIMES]: elements.buyTimes.value,
            [STORAGE_KEYS.SELL_TIMES]: elements.sellTimes.value,
            [STORAGE_KEYS.MONITOR_BUY]: elements.monitorBuy.checked,
            [STORAGE_KEYS.MONITOR_SELL]: elements.monitorSell.checked,
            [STORAGE_KEYS.AUTO_TRADE]: elements.autoTrade.checked,
            [STORAGE_KEYS.CHECK_INTERVAL]: elements.checkInterval.value,
            [STORAGE_KEYS.SIGNAL_COOLDOWN]: elements.signalCooldown.value,
            [STORAGE_KEYS.RECIPIENT_ADDRESS]: elements.recipientAddress.value,
            [STORAGE_KEYS.TIP_TOKEN]: elements.tipToken.value,
            [STORAGE_KEYS.TIP_AMOUNT]: elements.tipAmount.value
        };

        // 保存每个设置项
        Object.keys(settings).forEach(key => {
            const value = settings[key];
            if (value !== undefined && value !== null && value !== '') {
                localStorage.setItem(key, typeof value === 'boolean' ? value.toString() : value);
            }
        });

        console.log('✅ 用户设置已保存到localStorage');
    } catch (error) {
        console.error('❌ 保存用户设置失败:', error);
    }
}

function loadUserSettings() {
    try {
        // 加载代币地址
        const savedTokenAddress = localStorage.getItem(STORAGE_KEYS.TOKEN_ADDRESS);
        if (savedTokenAddress) {
            elements.tokenAddress.value = savedTokenAddress;
        }

        // 加载买入价格
        const savedBuyPrice = localStorage.getItem(STORAGE_KEYS.BUY_PRICE);
        if (savedBuyPrice) {
            elements.buyPrice.value = savedBuyPrice;
        }

        // 加载卖出价格
        const savedSellPrice = localStorage.getItem(STORAGE_KEYS.SELL_PRICE);
        if (savedSellPrice) {
            elements.sellPrice.value = savedSellPrice;
        }

        // 加载买入数量
        const savedBuyAmount = localStorage.getItem(STORAGE_KEYS.BUY_AMOUNT);
        if (savedBuyAmount) {
            elements.buyAmount.value = savedBuyAmount;
        }

        // 加载卖出数量
        const savedSellAmount = localStorage.getItem(STORAGE_KEYS.SELL_AMOUNT);
        if (savedSellAmount) {
            elements.sellAmount.value = savedSellAmount;
        }

        // 加载买入次数
        const savedBuyTimes = localStorage.getItem(STORAGE_KEYS.BUY_TIMES);
        if (savedBuyTimes) {
            elements.buyTimes.value = savedBuyTimes;
        }

        // 加载卖出次数
        const savedSellTimes = localStorage.getItem(STORAGE_KEYS.SELL_TIMES);
        if (savedSellTimes) {
            elements.sellTimes.value = savedSellTimes;
        }

        // 加载监控类型
        const savedMonitorBuy = localStorage.getItem(STORAGE_KEYS.MONITOR_BUY);
        if (savedMonitorBuy !== null) {
            elements.monitorBuy.checked = savedMonitorBuy === 'true';
        }

        const savedMonitorSell = localStorage.getItem(STORAGE_KEYS.MONITOR_SELL);
        if (savedMonitorSell !== null) {
            elements.monitorSell.checked = savedMonitorSell === 'true';
        }

        // 加载自动交易设置
        const savedAutoTrade = localStorage.getItem(STORAGE_KEYS.AUTO_TRADE);
        if (savedAutoTrade !== null) {
            elements.autoTrade.checked = savedAutoTrade === 'true';
        }

        // 加载检查频率
        const savedCheckInterval = localStorage.getItem(STORAGE_KEYS.CHECK_INTERVAL);
        if (savedCheckInterval) {
            elements.checkInterval.value = savedCheckInterval;
        }

        // 加载信号冷却时间
        const savedSignalCooldown = localStorage.getItem(STORAGE_KEYS.SIGNAL_COOLDOWN);
        if (savedSignalCooldown) {
            elements.signalCooldown.value = savedSignalCooldown;
        }

        // 加载接收地址
        const savedRecipientAddress = localStorage.getItem(STORAGE_KEYS.RECIPIENT_ADDRESS);
        if (savedRecipientAddress) {
            elements.recipientAddress.value = savedRecipientAddress;
        }

        // 加载打赏币种
        const savedTipToken = localStorage.getItem(STORAGE_KEYS.TIP_TOKEN);
        if (savedTipToken) {
            elements.tipToken.value = savedTipToken;
        }

        // 加载打赏数量
        const savedTipAmount = localStorage.getItem(STORAGE_KEYS.TIP_AMOUNT);
        if (savedTipAmount) {
            elements.tipAmount.value = savedTipAmount;
        }

        console.log('✅ 用户设置已从localStorage加载');
    } catch (error) {
        console.error('❌ 加载用户设置失败:', error);
    }
}

function clearUserSettings() {
    try {
        // 清除所有保存的设置
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('✅ 用户设置已清除');
        showNotification('用户设置已清除', 'success');
    } catch (error) {
        console.error('❌ 清除用户设置失败:', error);
        showNotification('清除用户设置失败', 'error');
    }
}