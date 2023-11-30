# Jupiter

## Informations
### Action
Not mandatory
DEFAULT buy = SOL -> token
sell = token -> SOL

### Slip (in %)
Not mandatory
DEFAULT = 0.5 

### Contract
Mandatory
The token contract to buy/sell

### Quantity
Quantity of the token in input (if action=buy it's SOL else this is the token linked to the contract=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)

### Wallet
MADATORY
Your secretKey 


## execut 
$ node swap_jup.js --wallet secretKey --action [BUY/sell] --slip [0.5] --quantity x.xx --contract EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
