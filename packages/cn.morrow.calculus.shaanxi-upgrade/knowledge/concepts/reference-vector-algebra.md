---
id: calculus.book.reference.vector-algebra
name: "向量代数"
chapter: calculus.book.reference
tags:
  - geometry
  - notes
difficulty: 3
exam_importance: high
learning_objectives:
  - "能写出空间平面与直线的方程，并判断位置关系"
summary: "向量的线性运算、数量积与向量积，是空间解析几何与曲面积分的计算基础。"
sources:
  - source.notes.personal
version: 1.0.0
---
### 1.基本概念

**向量**：既有大小又有方向的量称为向量，如果两个向量$\vec a$与$\vec b$大小相等，方向相同，则这两个向量相等，记作$\vec a = \vec b$。

**模**：向量的大小称为向量的模，记作$|\vec a|$，模为1的向量称为单位向量，模为0的向量称为零向量，零向量的方向是任意的。

**夹角**：设$\vec a$与$\vec b$为两个非零向量，任取空间一点$o$，作为$|\vec{OA}| = \vec a,|\vec{OB}| = \vec b$，规定不超过$\pi$的$\theta(0 \leq \theta \leq \pi)$为向量$\vec a$与$\vec b$的夹角。

**平行**：两个向量之间的夹角$\theta = 0或\pi$，记作$\vec a // \vec b$。

**垂直**：两个向量之间的夹角$\theta = \frac {\pi}{2}$，记作$\vec a \bot \vec b$。

```
注
1）向量与起点无关，只与大小与方向有关，所以任一向量都可以保持大小和方向不变的前提下，任意移动而不变。
2）任一非零向量除以它的模就为单位向量
```



### 2.线性运算

**加法**：三角形法则（首尾相连，从首至尾）和平行四边形法则

1）交换律：$\vec a + \vec b = \vec b + \vec a$

2）结合律：$(\vec a + \vec b) + \vec c= \vec a + (\vec b +\vec c)$

**减法**：同起点，指向被减向量

**数乘**：向量$\vec a$与实数$k$的乘积记作$k\vec a$，规定$|k\vec a| = |k|\cdot|\vec a|$，当$k > 0$时，$|k\vec a|与\vec a$同向，当$k < 0$时，$|k\vec a|与\vec a$方向相反。

1）结合律：$k_1(k_2\vec a) = (k_1k_2)\vec a$

2）分配律：$(k_1+k_2)\vec a=k_1\vec a+k_2\vec a \qquad k(\vec a+\vec b)=k\vec a+k\vec b$



### 3.向量平行

设向量$\vec a \neq 0$，则向量$\vec b$与$\vec a$平行的充分必要条件时存在唯一的实数点$k$，使得$\vec b=k\vec a$。当$k > 0$时，$\vec a$与$\vec b$同向；当$k < 0$时，$\vec a$与$\vec b$反向；当$k=0$时，$\vec b=0$，零向量与任意向量平行。



### 4.平面直角坐标系

​	在平面内取定点$o$与两个相互垂直的单位向量$\vec e_1$与$\vec e_2$就确定了以$o$为原点，以$\vec e_1$和$\vec e_2$方向的坐标轴$x$轴与$y$轴，建立了平面直角坐标系$xoy$，称$\vec e_1,\vec e_2$为该平面的基向量。

​	平面上任一向量$\vec a$均可平移到原点为起点的向量（方向和大小均不变），由三角形法则可知$\vec a=k_1 \vec e_1+k_2\vec e_2$，$(k_1,k_2)$称为$\vec a$在平面$xoy$上的坐标，可以记为$\vec a= (k_1,k_2)$

​	设$\vec a =(a_1,b_1),\vec b=(a_2,b_2)$，则
$$
\vec a+\vec b=(a_1+a_2,b_1+b_2) \\
k\vec a =(k\vec a_1,k \vec b_2) \\
|\vec a|=\sqrt {a_1^2+b_1^2}
$$
​	平面上任意两点$A(x_1,y_1),B(x_2,y_2)$，则$\vec {AB} = \vec {OB} =\vec{OA}=(x_2-x_1,y_2-y_1)$。

### 5.空间直角坐标系

![空间直角坐标系](./img/空间直角坐标系.png)

​	在空间中取一点$o$和两两垂直的三个单位向量$\vec i,\vec j,\vec k$就可以建立空间直角坐标系。则空间中任一向量$\vec r=\vec {OP}$就可以表示为
$$
\vec r = \vec {OP} = x\vec i+y\vec j+z\vec k
$$
​	该式称为向量$\vec r$的坐标分解式，也记作$\vec r=(x,y,z)$

​	设向量$\vec a=(a_1,b_1,c_1),\vec b=(a_2,b_2,v_2)$，则
$$
\vec a+\vec b=(a_1+a_2,b_1+b_2,c_1+c_2) \\
\vec a-\vec b=(a_1-a_2,b_1-b_2,c_1-c_2) \\
k\vec a=(ka_1,kb_1,kc_1)
$$
由前面定理知$\vec a //\vec b$的充分必要条件为$\vec b=k\vec a$，即$(a_2,b_2,c_2)=k(a_1,b_1,c_1)$，即有$\frac {a_2}{a_1}=\frac {b_2}{b_1}=\frac {c_2}{c_1}$。

设向量$\vec a =(a,b,v)$，则$|\vec a|=\sqrt {a^2+b^2+c^2}$。

设空间两点$A(x_1,y_1,z_1),B(x_2,y_2,z_2)$，则线段$AB$的长度$|AB|=|\vec {OB} -\vec{OA}| = |(x_2-x_1,y_2-y_1,z_2-z_1)|=\sqrt {(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}$。



### 6.数量积

​	设两个向量$\vec a、\vec b$，$\vec a$与$\vec b$的夹角记为$\theta$，定义$|\vec a| \cdot |\vec b| \cdot \cos \theta$为$\vec a$与$\vec b$的数量积，记作$\vec a \cdot \vec b=|\vec a|\cdot |\vec b|\cdot cos\theta$。

由数量积定义可得：

1）$\vec a \cdot \vec a =|\vec a|^2$

2）$\vec a \bot \vec b \Leftrightarrow \vec a \cdot \vec b = 0$

3）$\vec a \cdot \vec b =\vec b \cdot \vec a$（交换律）

4）$(\vec a+\vec b)\cdot \vec c =\vec a \cdot \vec c+ \vec b \cdot \vec c$（分配律）

5）$(k\vec a)\cdot \vec b=k(\vec a \cdot \vec b)$（结合律）

6）$|\vec a \cdot \vec b| \leq |\vec a|\cdot |\vec b|$

7）若$\vec a=(x_1,y_1),\vec b=(x_2,y_2)$，则$\vec a\cdot \vec b=x_1x_2+y_1y_2$；

若$\vec a=(x_1,y_1,z_1),\vec b=(x_2,y_2,z_2)$，则$\vec a\cdot \vec b=x_1x_2+y_1y_2+z_1z_2$；



### 7.向量积

设$\vec a$与$\vec b$为两个向量，由$\vec a$与$\vec b$按照如下方法生成一个新向量$\vec c$：

​	（1）$\vec c$的模：$|\vec c|=|\vec a \times \vec b|=|\vec a| \cdot |\vec b| \cdot sin\theta$

​	（2）$\vec c$的方向：由$\vec a$到$\vec b$按照右手规则，大拇指所指的方向即为$\vec c$的方向。

则称向量$\vec c$为$\vec a$与$\vec b$的向量积，记为$\vec c=\vec a \times \vec b$

关于向量积有如下规律：

1）$\vec a \times \vec a =0$

2）对于两个非零向量，$\vec a// \vec b \Leftrightarrow \vec a \times \vec b =\vec 0$

3）$\vec a \times \vec b = -\vec b \times \vec a(模相同，方向相反)$

4）$(\vec a +\vec b) \times \vec c =\vec a \times \vec c + \vec b \times \vec c$

5）$(k\vec a)\times \vec b=k(\vec a \times \vec b)$

6）设$\vec a =(a_1,b_1,c_1),\vec b=(a_2,b_2,c_2)$，则$\vec a \times \vec b = (b_1c_2-c_1b_2,-a_1c_2+c_1a_2,a_1b_2-b_1a_2)$
