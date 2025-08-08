# 从钱包导出私钥指南

## Phantom钱包

### 导出私钥步骤：
1. 打开Phantom钱包扩展
2. 点击设置图标（齿轮）
3. 选择"导出私钥"
4. 输入钱包密码
5. 复制私钥（Base58格式）
6. 创建文本文件，粘贴私钥并保存为 `.txt` 文件

### 示例文件格式：
```
5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS
```

## Solflare钱包

### 导出私钥步骤：
1. 打开Solflare钱包
2. 点击设置
3. 选择"导出私钥"
4. 输入密码确认
5. 复制私钥
6. 保存为文本文件

## Solana CLI工具

### 生成新钱包：
```bash
# 生成新钱包
solana-keygen new --outfile my-wallet.json

# 查看公钥
solana-keygen pubkey my-wallet.json
```

### 导出现有钱包：
```bash
# 导出私钥（Base58格式）
solana-keygen pubkey --keypair my-wallet.json

# 导出为JSON格式
cat my-wallet.json
```

## 在线钱包生成器（仅用于测试）

⚠️ **警告**：仅用于测试目的，不要用于存储真实资金

1. 访问可信的在线钱包生成器
2. 生成新钱包
3. 下载私钥文件
4. 保存到本地

## 文件格式转换

### Base58转JSON格式：
```javascript
// 使用Solana Web3.js
const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

const privateKeyBase58 = 'your-base58-private-key';
const decoded = bs58.decode(privateKeyBase58);
const keypair = Keypair.fromSecretKey(decoded);

const jsonFormat = {
  publicKey: keypair.publicKey.toString(),
  secretKey: Array.from(keypair.secretKey)
};

console.log(JSON.stringify(jsonFormat, null, 2));
```

### JSON转Base58格式：
```javascript
const { Keypair } = require('@solana/web3.js');

const jsonData = {
  secretKey: [1, 2, 3, ...] // 64个数字
};

const keypair = Keypair.fromSecretKey(new Uint8Array(jsonData.secretKey));
const base58PrivateKey = bs58.encode(keypair.secretKey);
console.log(base58PrivateKey);
```

## 安全最佳实践

### 1. 文件安全
- 使用强密码保护私钥文件
- 将文件存储在加密容器中
- 定期备份到安全位置

### 2. 传输安全
- 使用加密传输协议
- 避免通过邮件或聊天工具发送
- 使用安全的文件共享服务

### 3. 使用安全
- 在安全的计算机上使用
- 使用后及时删除临时文件
- 定期检查文件完整性

### 4. 备份策略
- 多个备份位置
- 离线存储
- 定期验证备份有效性

## 故障排除

### 常见问题：

1. **"私钥格式错误"**
   - 检查是否包含额外字符
   - 确保没有多余的空格或换行

2. **"文件读取失败"**
   - 检查文件编码（应为UTF-8）
   - 确保文件没有损坏

3. **"权限被拒绝"**
   - 检查文件权限设置
   - 确保浏览器有读取权限

### 验证私钥：

```javascript
// 验证私钥格式
function validatePrivateKey(privateKey) {
  try {
    const decoded = bs58.decode(privateKey);
    return decoded.length === 64;
  } catch (error) {
    return false;
  }
}
```

## 支持的格式总结

| 钱包类型 | 导出格式 | 文件扩展名 | 说明 |
|----------|----------|------------|------|
| Phantom | Base58 | .txt | 直接复制私钥 |
| Solflare | Base58 | .txt | 直接复制私钥 |
| Solana CLI | JSON | .json | 标准格式 |
| 在线生成器 | 多种 | .json/.txt | 根据生成器而定 |

## 注意事项

1. **测试网络**：建议先在测试网络上测试
2. **小额测试**：首次使用时只转移小额资金
3. **多重验证**：重要操作前多次确认
4. **定期检查**：定期验证钱包余额和交易记录
