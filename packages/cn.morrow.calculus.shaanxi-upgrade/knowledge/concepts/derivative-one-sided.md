---
id: calculus.derivative.one-sided
name: 左右导数与可导性
chapter: calculus.chapter.derivative
tags:
  - derivative
  - one-sided
difficulty: 3
exam_importance: critical
learning_objectives:
  - 能分别写出左导数与右导数的定义式
  - 能判断分段函数在分段点的可导性
summary: 函数在一点可导的充要条件是左导数与右导数都存在且相等；可导必连续，连续不一定可导。
prerequisites:
  - calculus.derivative
  - calculus.limit.one-sided
sources:
  - source.textbook.tongji-7
---

# 左右导数与可导性

连续只是"曲线不断开"，可导还要求"曲线没有尖角"。分段函数在分段点处，两侧表达式不同，必须分别算左导数和右导数，再比较。

## 一、知识概述

可导性是一个比连续性更强的要求。判断分段点是否可导，需要三步：先确认连续，再分别求左右导数，最后看是否相等。跳过连续性这一环，很容易在根本不连续的点上讨论导数。

## 二、核心定义

$$f'_-(x_0)=\lim_{\Delta x\to 0^-}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}$$

称为左导数，把 $\Delta x\to 0^-$ 换成 $0^+$ 则为右导数。

**可导的充要条件**：

$$f'(x_0)\ \text{存在}\iff f'_-(x_0)=f'_+(x_0)$$

## 三、性质与定理

- **可导必连续**：$f$ 在 $x_0$ 可导 $\Rightarrow$ $f$ 在 $x_0$ 连续。
- **连续不一定可导**：$f(x)=|x|$ 在 $0$ 处连续，但 $f'_-(0)=-1$、$f'_+(0)=1$，故不可导。
- 分段点处若左右导数相等，该点可导；否则不可导，且曲线在该点出现尖角或竖切线。

## 四、公式与推导

设 $f(x)=\begin{cases}x^2, & x\le 1\\ ax+b, & x>1\end{cases}$，若 $f$ 在 $x=1$ 处可导，求 $a$、$b$。

先由连续性：$\lim\limits_{x\to 1^-}x^2=1$，$\lim\limits_{x\to 1^+}(ax+b)=a+b$，得 $a+b=1$。

再由可导性：$f'_-(1)=\lim\limits_{\Delta x\to 0^-}\frac{(1+\Delta x)^2-1}{\Delta x}=2$，$f'_+(1)=\lim\limits_{\Delta x\to 0^+}\frac{a(1+\Delta x)+b-1}{\Delta x}=a$。两式相等得 $a=2$，代回得 $b=-1$。

## 五、典型例题

判断 $f(x)=|x|$ 在 $x=0$ 处是否可导。

$f'_-(0)=\lim\limits_{\Delta x\to 0^-}\frac{|\Delta x|}{\Delta x}=-1$，$f'_+(0)=\lim\limits_{\Delta x\to 0^+}\frac{|\Delta x|}{\Delta x}=1$。两侧不相等，故 $f'(0)$ 不存在。

## 六、常见错误

- 由连续性直接推断可导。
- 只算出一侧导数就断言可导。
- 用求导公式对分段点两侧分别求导后直接比较，却没先验证连续性。

## 七、前置知识

[导数的定义](./derivative.md) 给出单侧导数从何而来；[左右极限](./limit-one-sided.md) 是它的极限基础。

## 八、拓展内容

可导性判断有一个常见陷阱：参数题往往同时给出"连续"和"可导"两个条件。此时连续性条件列一个方程，可导性条件列一个方程，两个未知数两个方程恰好可解。只用一个条件会得到无穷多解，那说明漏读了一个前提。
