---
title: "期权基础：不同Combo交易策略及其Payoff结构"
date: "2025-12-26"
summary: "主流期权交易所通常支持多腿组合订单，允许交易者将不同的期权（甚至现货）按预先设定的比例组合在一起，从而显著降低了单腿先行成交所带来的 legging risk。"
tags: ["Quant", "tutorial"]
slug: "option-combo-payoff"
lang: "zh"

---

## 期权组合（Combo）交易分析

主流期权交易所通常支持多腿组合订单（combo / strategy order），允许交易者将不同行权价、到期日或类型的期权（甚至现货）按预先设定的比例组合在一起，并以组合的净价进行报价和撮合。组合订单在撮合层面作为一个原子化的执行单元处理，从而显著降低了单腿先行成交所带来的 legging risk，并锁定了各腿之间的执行比例。

根据构建目的，通常分为四大类：

* **垂直价差 (Vertical Spreads)**： 定向交易，但牺牲潜在收益以换取成本降低和风险封顶。

* **波动率策略 (Volatility Strategies)**： 主要以波动幅度为交易目标，对价格方向的依赖较弱，核心风险暴露在波动率而非价格方向上。

* **区间/中性策略 (Range/Neutral Strategies)**： 预期标的资产价格在特定区间内震荡，赚取时间价值。这类策略通常通过卖出期权赚取时间价值，其收益依赖于标的价格在到期前是否保持在预期区间内。

* **现货结合与时间策略 (Hybrid & Time Strategies)**： 结合持有现货资产，或利用不同到期日的时间价值衰减差异。

### 第一组：垂直价差策略 (Vertical Spreads)

此类策略通过“买低卖高”或“卖低买高”同类型期权构建。牛市和熊市价差均可通过 Call 或 Put 构建，区别在于资金流向（Debit vs Credit）。

#### 牛市价差 (Bull Spread)

* **核心逻辑：** 投资者看涨，但认为涨幅有限。
* **类型 A：牛市看涨价差 (Bull Call Spread)** —— *“买方思维”*
  * **构建：** 买入低行权价 Call ($K_L$) + 卖出高行权价 Call ($K_H$)。
  * **资金流：** 净流出 (Debit)。你需要先付钱建立头寸。
  * **逻辑：** 用卖出 $K_H$ 的权利金来降低买入 $K_L$ 的成本。
  * **到期损益公式：**


    $$
    P\&L = [\max(S_T - K_L, 0) - \max(S_T - K_H, 0)] - \text{Debit}
    $$
    *(前项为价差组合的最终价值，减去初始支出的成本即为盈亏)*
    
    ```chart
    bull-call-spread
    ```

* **类型 B：牛市看跌价差 (Bull Put Spread)** —— *“卖方思维”*
  * **构建：** 买入低行权价 Put ($K_L$) + 卖出高行权价 Put ($K_H$)。
  * **资金流：** 净流入 (Credit)。你先收到钱（权利金）。
  * **逻辑：** 主要是为了收租（卖出 $K_H$），同时买入 $K_L$ 作为保险，防止股价暴跌穿仓。只要股价维持在 $K_H$ 以上，权利金全收。
  * 到期损益公式：


    $$
    P\&L = \text{Credit} - [\max(K_H - S_T, 0) - \max(K_L - S_T, 0)]
    $$
    *(Credit 是最大收益；方括号内是可能赔付的价差金额)*

    ```chart
    bull-put-spread
    ```

#### 熊市价差 (Bear Spread)

* **核心逻辑：** 投资者看跌，但认为跌幅有限。
* **类型 A：熊市看跌价差 (Bear Put Spread)** —— *“买方思维”*
  * **构建：** 买入高行权价 Put ($K_H$) + 卖出低行权价 Put ($K_L$)。
  * **资金流：** 净流出 (Debit)。你需要先付钱。
  * **逻辑：** 低成本做空。
  * **到期损益公式：**
    $$
    P\&L = [\max(K_H - S_T, 0) - \max(K_L - S_T, 0)] - \text{Debit}
    $$
    
    ```chart
    bear-put-spread
    ```

* **类型 B：熊市看涨价差 (Bear Call Spread)** —— *“卖方思维”*
  * **构建：** 买入高行权价 Call ($K_H$) + 卖出低行权价 Call ($K_L$)。
  * **资金流：** 净流入 (Credit)。你先收到钱。
  * **逻辑：** 主要是为了收租（卖出 $K_L$），赌股价不会涨过 $K_L$。
  * **到期损益公式：**
    $$
    P\&L = \text{Credit} - [\max(S_T - K_L, 0) - \max(S_T - K_H, 0)]
    $$

    ```chart
    bear-call-spread
    ```

### 第二组： 波动率策略 (Volatility Strategies)
此类策略通常在重大事件（如财报发布、加息决议）前使用。

#### 买入跨式 (Long Straddle)
* **构建:** 同时买入相同行权价 $K$、相同到期日的 Call 和 Put，这个 $K$ 通常是当前标的价格（ATM，平值）。
* **资金流:** 大额净流出。
* **逻辑:** 做多波动率 (**Long Vega**)。投资者确信市场将出现剧烈波动，但无法判断方向。
* **风险/收益特征:**
    * *最大亏损:* 两份权利金之和。
    * *最大收益:* 无限 (Unlimited)。
* **到期损益公式:**
    $$
    P\&L = [\max(S_T - K, 0) + \max(K - S_T, 0)] - \text{Total Debit}
    $$
    *(也就是 $|S_T - K| - \text{Total Cost}$)*

    ```chart
    long-straddle
    ```

> 在专业交易和教科书定义中，构建 Straddle 的标准做法就是选择最接近当前股价的行权价。原因主要有以下两点：
> 1. 保持 Delta 中性 (Delta Neutrality)：
>    * ATM Call 的 Delta 约为 +0.5。
>    * ATM Put 的 Delta 约为 -0.5。
>    * 两者结合，组合的总 Delta 约为 0。这意味着在建立仓位的初始时刻，你完全不持有任何方向性偏见（不赌涨也不赌跌），纯粹只赌“变盘”。如果你选了非 ATM 的行权价，组合就会自带看涨或看跌的 Delta 敞口。
> 2. Vega 效率最高：
>    * ATM 期权的 Vega (波动率敏感度) 是所有行权价中最高的。
>    * 既然 Straddle 是一个做多波动率的策略，选择 ATM 能让你在波动率上升时获得最大的收益膨胀。
>
> **补充说明：** 虽然理论上你也可以买入一个非 ATM 的 Straddle（例如股价 100，买入 110 的 Call 和 110 的 Put），但这通常不被称为标准的 Straddle，而且这会带有明显的看跌偏见（因为 110 的 Put 是实值的，Delta 绝对值更大）。

#### 买入宽跨式 (Long Strangle)
* **构建:** 买入虚值 (OTM) Put ($K_L$) + 买入虚值 Call ($K_H$)。
* **差异:** 相比 Straddle，成本更低，但需要更大的波动幅度才能盈利。
* **到期损益公式:**
    $$
    P\&L = [\max(S_T - K_H, 0) + \max(K_L - S_T, 0)] - \text{Total Debit}
    $$

    ```chart
    long-strangle
    ```

> Straddle 这个词的原意就是“跨坐”，譬如跨坐在一匹马上，强调在”正中间“。而Straddle combo就是这样一种策略：你买了一个Call（向上），又买了一个Put（向下），行权价就在正中间（ATM），因此不管价格往上还是往下，你都”坐在中间“，两边都能抓住。
>
> 而 Strangle 在日常英语里的意思更为激烈、更具侵略性：掐住，扼住。因为你这次不是“坐在正中间”，而是把call放在上方，put放在下方，你在试图“掐住”他们，让他们脱离虚值的价格区间。

此外，与之对应地，我们也会有 short straddle 和 short strangle，它们对应的是“赌不会有太大波动”的交易策略，这里不过多赘述。

---

## 第三组：收益增强与中性策略 (Income & Neutral Strategies)

### 铁鹰式 (Iron Condor)
* **构建:** 卖出虚值 Put Spread (Bull Put, $K_0 < K_1$) + 卖出虚值 Call Spread (Bear Call, $K_2 < K_3$)。
* **行权价顺序:** $K_0 < K_1 < S < K_2 < K_3$ （$S$ 为Spot price, 当前价格）
    * 外层 ($K_0, K_3$) 是买入保护腿，内层 ($K_1, K_2$) 是卖出收租腿。
* **资金流:** 净流入 (**Credit Strategy**)。
* **逻辑:** 做空波动率 (**Short Vega**)。赌区间震荡。
* **到期损益公式:**
    $$
    P\&L = \text{Credit} - \text{Loss from either side}
    $$
    具体展开为：
    $$
    P\&L = \text{Credit} - \max(K_1 - S_T, 0) + \max(K_0 - S_T, 0) \\- \max(S_T - K_2, 0) + \max(S_T - K_3, 0)
    $$
    *(注意：只要股价在 $K_1$ 和 $K_2$ 之间，后面一长串全是 0，P&L = Credit)*

    ```chart
    iron-condor
    ```

> Iron Condor 的名字来源于“铁鹰”，因为这种策略的收益曲线形状像一只铁鹰，有两对翅膀（保护腿和收租腿）。它本质上就是一个风险封顶的 short strangle。在实际交易中，Iron Condor 通常不会持有到到期，而是在价格接近区间边缘或隐含波动率显著下降时提前平仓

### 蝶式价差 (Butterfly Spread)

* **核心逻辑:** 极度中性 (**Neutral**) 且 做空波动率。认为股价到期时会死死钉在中间行权价 $K_M$ 上。
* **行权价结构要求:** 选择三个等间距的行权价 $K_L, K_M, K_H$，其中 $K_M = (K_L + K_H) / 2$。
    * **$K_M$ (Body):** 通常选择等于当前股价 (ATM)，这是策略的获利目标位。
    * **$K_L$ (Lower Wing) & $K_H$ (Upper Wing):** 定义了获利区间的宽度。

#### Type A: 多头看涨蝶式 (Long Call Butterfly)
* **构建:** 买入 1份低价 Call ($K_L$) + 卖出 2份中间价 Call ($K_M$) + 买入 1份高价 Call ($K_H$)。
* **资金流:** 净流出 (**Debit**)。因为ITM的低价Call的权利金会很贵。
* **状态拆解:** $K_L$ 通常为实值 (ITM)，$K_M$ 为平值 (ATM)，$K_H$ 为虚值 (OTM)。
* **逻辑本质:** 它等于 一个牛市价差 ($+C_L -C_M$) 加上 一个熊市价差 ($-C_M +C_H$)。
    * *牛市价差* 负责赚取 $K_L$ 到 $K_M$ 的上涨收益。
    * *熊市价差* 负责抵消 $K_M$ 以上的进一步上涨（封顶收益）。

#### Type B: 多头看跌蝶式 (Long Put Butterfly)
* **构建:** 买入 1份低价 Put ($K_L$) + 卖出 2份中间价 Put ($K_M$) + 买入 1份高价 Put ($K_H$)。
* **资金流:** 净流出 (**Debit**)。
* **对比:** 根据 Put-Call Parity，若行权价相同，Call Butterfly 和 Put Butterfly 的风险收益曲线图几乎完全一致，构建成本也极其接近。交易者通常根据 Call/Put 端的流动性优劣来选择使用哪一种。

    ```chart
    long-put-butterfly
    ```

#### 风险/收益特征 (Risk/Reward Profile)
* **最大收益:** 当 $S_T = K_M$ 时（精准命中）。
*   **最大收益:** 当 $S_T = K_M$ 时（精准命中）。
    $$\text{Max Profit} = (K_M - K_L) - \text{Debit}$$
*   **最大亏损:** 当 $S_T \le K_L$ 或 $S_T \ge K_H$ 时（大幅偏离）。
    $$\text{Max Loss} = \text{Debit} \text{ (仅损失初始支付的权利金)}$$
*   **盈亏平衡点:** $K_L + \text{Debit}$ 和 $K_H - \text{Debit}$。

#### 到期损益公式 (Call Butterfly)
$$P\&L = [\max(S_T - K_L, 0) - 2\max(S_T - K_M, 0) + \max(S_T - K_H, 0)] - \text{Debit}$$
*(图像呈“帐篷”状，中间尖顶收益最高，两边迅速滑落至亏损)*

```chart
long-call-butterfly
```

> Butterfly 可以理解为在同一到期日下，将一个 bull spread 与一个 bear spread 在中间行权价处背靠背组合而成。两个价差在方向上相互抵消，从而将原本的方向性收益压缩为对到期价格落在 ATM 附近的押注。

---

## 第四组：现货结合与时间策略 (Hybrid & Time Strategies)

这是机构投资者管理现货头寸 (**Cost Basis Reduction**) 的核心手段。

### 5.1 备兑开仓 (Covered Call)
* **构建:** 持有现货 (Long Stock) + 卖出看涨期权 (Short Call)。
* **逻辑:** 中性偏多。你持有股票，但认为近期涨幅有限，于是卖出 Call 收取权利金来增强收益 (**Yield Enhancement**)。
* **角色:** 这是一个 **“用上行空间换取确定性收入”** 的策略。
    * 如果股价暴涨，你的股票会被 Call 走（止盈）；
    * 如果股价横盘或微跌，权利金提供了缓冲保护。
* **到期损益公式:**
    $$
    P\&L = (S_T - S_{entry}) + \text{Credit} - \max(S_T - K, 0)
    $$
    *(当 $S_T > K$ 时，收益被封顶在 $(K - S_{entry}) + \text{Credit}$)*

    ```chart
    covered-call
    ```

### 5.2 备兑看跌 (Covered Put)
* **构建:** 做空现货 (Short Stock) + 卖出看跌期权 (Short Put)。
* **逻辑:** 中性偏空。你已经做空了股票，但认为近期跌幅有限，于是卖出 Put 收取权利金。
* **角色:** 这是一个 **“用下行空间换取确定性收入”** 的策略。
    * 如果股价暴跌，Put 会被行权，你必须买入股票平掉空头仓位（止盈）；
    * 如果股价横盘或微涨，权利金提供了缓冲。
* **风险提示:** 你的空头仓位依然面临股价暴涨带来的无限风险，但卖出的 Put 只能提供有限的权利金保护。
* **到期损益公式:**
    $$
    P\&L = (S_{entry} - S_T) + \text{Credit} - \max(K - S_T, 0)
    $$
    *(当 $S_T < K$ 时，收益被封顶在 $(S_{entry} - K) + \text{Credit}$)*

    ```chart
    covered-put
    ```

### 5.3 Covered Combo (Covered Strangle)
这是一种机构级的激进增强型策略，常被称为 "Triple Income Strategy"（三重收入：股票涨幅 + Call权利金 + Put权利金）。它是 Covered Call 和 Short Put 的结合体。

* **别名:** Covered Strangle, Two-fer.
* **构建公式:**
    $$
    \text{Covered Combo} = \text{Long Stock} (S) + \text{Short OTM Call} (K_H) + \text{Short OTM Put} (K_L)
    $$
    *(通常 $K_L < S < K_H$)*

#### 角色深度拆解
1. **持有股票 (Long Stock):** 核心资产，也是策略的基础。
2. **卖出虚值 Call (Covered Call Leg):** 认为股价短期内不会暴涨超过 $K_H$。卖出 Call 收取权利金来增强收益 (**Yield Enhancement**)。如果涨超了，愿意在 $K_H$ 止盈离场。
3. **卖出虚值 Put (Naked Put Leg):** 认为股价短期内不会暴跌跌破 $K_L$。卖出 Put 收取权利金。如果跌破了，愿意在 $K_L$ 加仓买入更多股票。

#### 适用场景
* 你长期看好这只股票，且现在的仓位还没买够。
* 你希望通过双重权利金大幅降低持仓成本 (**Cost Basis**)。
* 市场处于震荡期，不像会大涨也不像会大跌。

#### 情景推演与风险
* **场景 A (震荡 $K_L < S_T < K_H$):** 完美剧本。Call 和 Put 都归零，你白赚两份权利金，股票还在手里。
* **场景 B (暴涨 $S_T > K_H$):** 踏空风险。股票必须在 $K_H$ 卖给别人，虽然赚了股票价差和两份权利金，但错过了 $K_H$ 以上的涨幅。
* **场景 C (暴跌 $S_T < K_L$):** **核心风险点**。
    * 你的手里已有的股票在亏钱。
    * 你卖出的 Put 被行权，必须以 $K_L$ 的价格（高于市价）买入更多正在下跌的股票。
    * **结果:** 你现在的仓位是原来的 2倍，且都在亏损。这被称为“接飞刀”。

* **到期损益公式:**
    $$
    P\&L = (S_T - S_{entry}) + \text{Credit}_{Call} + \text{Credit}_{Put} - \max(S_T - K_H, 0) - \max(K_L - S_T, 0)
    $$

    ```chart
    covered-combo
    ```

### 5.4 日历价差 (Calendar Spread)
这是一种利用时间价值衰减速度差异的精细化套利策略。

* **别名:** Time Spread, Horizontal Spread.
* **构建公式:**
    $$
    \text{Long Calendar} = \text{Short Near-Month Option} (T_1) + \text{Long Far-Month Option} (T_2)
    $$
    *(行权价 $K$ 相同，通常选择 ATM)*

#### 核心原理：Theta 衰减非线性
期权的时间价值 (Theta) 并不是线性衰减的。临近到期时，Theta 衰减会极具加速。
* **近月期权 ($T_1$):** 衰减极快，每天都在疯狂掉血（对卖方有利）。
* **远月期权 ($T_2$):** 衰减较慢，价值相对稳定（对买方有利）。
* **获利来源:** 你赚的是 ($T_1$ 快速衰减掉的钱) - ($T_2$ 慢速衰减掉的钱) 的差额。

#### Vega 风险 (波动率陷阱)
这是一个 **Long Vega** 策略。虽然你卖了一个 Call，但远月期权的 Vega 远大于近月期权。
* **利好:** 波动率上升。远月期权涨得比近月快。
* **利空:** 波动率下降 (**IV Crush**)。如果你在财报前买入日历价差，财报后 IV 暴跌，虽然近月归零了，但你手里的远月期权价值也会缩水严重，导致亏损。

#### 获利区间
* 最佳结果是股价在近月到期日 ($T_1$) 精准停留在行权价 $K$。
* 此时近月期权刚好归零（卖方完美收官），而远月期权因为是 ATM，剩余的时间价值最大。

* **到期损益估算 (在 $T_1$ 时刻):**
    $$
    P\&L \approx \text{Price}(T_2, K, S_{T1}) - \text{Initial Debit}
    $$
    *(注意：这个策略没有确定的到期 payoff 公式，因为 $T_2$ 期权在 $T_1$ 时刻还没到期，其价值取决于当时的残余时间价值和波动率)*

---

## 组合策略数学模型摘要 

| 策略 (Strategy) | 构成 (Legs) | 核心特征 (Feature) | 备注 (Note) |
| :--- | :--- | :--- | :--- |
| **Bull Call Spread** | $+C(K_L) - C(K_H)$ | 限制收益以降低成本 | Debit (净支出) |
| **Iron Condor** | Short Put Spread + Short Call Spread | 收租，双向风险封顶 | 中性策略 |
| **Butterfly** | $+C(K_1) -2C(K_2) +C(K_3)$ | 极低成本博高收益 | 精准中性 |
| **Covered Call** | Stock $- C(K)$ | 上方封顶，增强收益 | 现货结合 |
| **Covered Put** | Short Stock $- P(K)$ | 下方封顶，增强收益 | 现货结合 |
| **Covered Combo** | Stock $- C(K_H) - P(K_L)$ | 双重收租，愿低位加仓 | 激进增强 |
| **Calendar Spread** | $-C_{Near} + C_{Far}$ | 赚取 Theta 衰减差 | 时间策略 |

