# 介绍
一个简单的浏览器代理，数据在传输中没有加密，涉及敏感操作以及对安全性有要求的慎用。
# 安装
`npm install lx-simple-proxy -g`
# 环境
windows或Linux<br/>
node版本12.0以上
# 使用
## 客户端
```
Usage:lx-simple-client --lp [local port] --ra [remote address] --rp [remote port] --pwd [password]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
  --ra                                                                [required]
  --pwd                                                      [string] [required]
  --lp                                                           [default: 4400]
  --rp                                                           [default: 4399]
```

`lx-simple-client --lp 4400 --ra www.myhost.com --rp 4399 --pwd 123456`
## 服务端
```
Usage:lx-simple-server --port [port] --pwd [password]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
  --pwd                                                      [string] [required]
  --port                                                [number] [default: 4399]
```

`lx-simple-server --port 4399 --pwd 123456`

## 浏览器代理设置
打开浏览器代理设置，地址填 `127.0.0.1`，端口填 `4400`
# License
MIT