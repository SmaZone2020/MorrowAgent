---
id: calculus.derivative
name: 导数的定义
chapter: calculus.chapter.derivative
tags:
  - derivative
  - basic
difficulty: 2
exam_importance: high
learning_objectives:
  - 能用定义式求简单函数在一点的导数
  - 能说清导数与切线斜率、瞬时变化率的关系
summary: 函数在一点的导数是函数值改变量与自变量改变量之比的极限，刻画该点的瞬时变化率与切线斜率。
prerequisites:
  - calculus.limit
sources:
  - source.textbook.tongji-7
---

# 导数的定义

导数是"差商的极限"。先算平均变化率，再让自变量改变量趋于零，剩下的就是瞬时变化率——几何上它就是切线斜率。

## 一、知识概述

导数衡量的是"某一点处函数变化得有多快"。用平均变化率去逼近瞬时变化率，这个逼近过程正是极限；所以导数的定义本质上是上一章极限概念的一次应用。

## 二、核心定义

设 $y=f(x)$ 在 $x_0$ 的某邻域内有定义。若极限

$$f'(x_0)=\lim_{\Delta x\to 0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}$$

存在，则称 $f$ 在 $x_0$ 处可导，该极限值称为 $f$ 在 $x_0$ 处的导数。

也可以写成

$$f'(x_0)=\lim_{x\to x_0}\frac{f(x)-f(x_0)}{x-x_0}$$

两种写法等价，第二种在已知函数值时更快。

## 三、性质与定理

- **几何意义**：$f'(x_0)$ 是曲线 $y=f(x)$ 在点 $(x_0,f(x_0))$ 处切线的斜率，切线方程为 $y-f(x_0)=f'(x_0)(x-x_0)$。
- **物理意义**：若 $s=s(t)$ 是位移，则 $s'(t_0)$ 是 $t_0$ 时刻的瞬时速度。
- **可导必连续**：在一点可导则在该点连续；反之不成立，$f(x)=|x|$ 在 $0$ 处连续但不可导。

## 四、公式与推导

按定义求 $f(x)=x^2$ 在 $x=1$ 处的导数：

$$\frac{f(1+\Delta x)-f(1)}{\Delta x}=\frac{(1+\Delta x)^2-1}{\Delta x}=\frac{2\Delta x+(\Delta x)^2}{\Delta x}=2+\Delta x$$

令 $\Delta x\to 0$，得 $f'(1)=2$。整个过程只有两步：展开约分、再取极限。

## 五、典型例题

设 $f(x)=\dfrac{1}{x}$，用定义求 $f'(1)$。

$$\frac{f(1+\Delta x)-f(1)}{\Delta x}=\frac{\frac{1}{1+\Delta x}-1}{\Delta x}=\frac{-\Delta x}{\Delta x(1+\Delta x)}=\frac{-1}{1+\Delta x}$$

令 $\Delta x\to 0$，得 $f'(1)=-1$。

## 六、常见错误

- 把导数定义式写成缺少分式的形式，或漏掉分母的 $\Delta x$。
- 在分段点处直接套用求导公式，而不回到定义判断左右导数。
- 忘记"可导必连续"只是单向结论，由连续反推可导。

## 七、前置知识

[极限存在的判定](./limit.md)：定义式本身就是一个极限，判定它存在才能谈导数。

## 八、拓展内容

定义式的两种写法在不同场合各有用处。$\Delta x$ 形式适合做代数化简，$x\to x_0$ 形式适合已知具体函数值的情形。考试中若给出 $f'(x_0)$ 的数值而要求某个变形极限，通常是把式子凑成定义式，而不是重新求导。
