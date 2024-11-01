+++
date = "2024-10-23T22:24:00-05:00"
title = "浅谈C++ auto"
description = "用法和自动类型推导规则的辨析"
lang = "zh"
slug = "cpp-auto"
draft = false


[extra]
    image = { path = "images/cpp-history.png", alt = "code-img", visible_in_page = false, visible_in_section = true }
    page_identifier = "cpp-auto"
+++

`auto` 这个关键字其实早在C语言中就存在，彼时它的语义是指示变量具有[自动存储期（automatic storage duration）](https://en.cppreference.com/w/cpp/language/storage_duration)，即变量在进入其声明所在的代码块时被创建，并在离开该代码块时自动销毁。但由于这本就是局部变量的默认行为，所以几乎没有人使用它。因此C++之父Bjarne Stroustrup在C++11中巧妙地借用了这个既存的关键字，并赋予它新的含义，自动类型推导（**auto**matic type deduction）。`auto` 在处理复杂类型（如各种iterator）以及那些难以甚至无法写出确切类型的变量（如lambda）时非常有用。
<!--more-->

## 基本语法

`auto`关键字允许编译器根据初始化表达式自动推导变量的类型。以下是一些基本用法示例：

1. 直接通过值推导：
   ```cpp
   auto x = 3.14; // x 的类型为 double
   auto y = 42;   // y 的类型为 int
   auto z(1);     // z 的类型为 int
   ```
2. 根据表达式推导：
   ```cpp
   int foo();
   auto x1 = foo(); // x1 : int
   ```
3. 含有cv限定符、引用或指针的推导：
   ```cpp
   const auto& x2 = foo(); // x2 : const int& 
   auto& x3 = foo(); // x3 : int& - 错误，不能将引用绑定到临时对象
   
   float& bar();
   auto y1 = bar(); // y1 : float
   const auto& y2 = bar(); // y2 : const float& 
   auto& y3 = bar(); // y3 : float&
   
   A* fii();
   auto* z1 = fii(); // z1 : A*
   auto z2 = fii(); // z2 : A*
   auto* z3 = bar(); // 错误，bar 不返回指针类型
   ```
   从上面几个例子里，`auto`的类型推导规则已经初见端倪，我们将在下一节具体介绍。
   而一个略微偏题但值得注意的情形是，const引用可以绑定到临时对象上（`const auto& x2 = foo()`），而非const引用则不行。从语义上说，修改临时对象本身就没有意义；从生命周期上说，如果允许非const引用绑定到临时对象，那么在临时对象销毁后，引用将变成悬空引用（dangling reference），而const引用会延长临时对象的生命周期，使其与引用的生命周期相同<sup id="a1">[1](#f1)</sup>。
4. 多变量声明：
   ```cpp
   // 多变量声明
   auto a = 1, *b = &a; // 有效，声明从左到右处理
   auto x = 1, *y = &x; // 同样有效，因为声明是从左到右处理的
   auto m = 1, y = 3.14; // 报错，因为类型不统一
   ```
   在多变量声明中，`auto` 的类型由第一个声明推导而来，后续声明必须与此兼容，这是因为声明是从左到右处理的。
5. 在动态分配中使用：
    ```cpp
    auto* p = new auto(1);  // 在动态分配中使用 auto
    ```
    这是一个不常见单确实合法的语法。

## 类型推导规则

> 本节涉及的代码可以在[这里](https://github.com/EtoDemerzel0427/LangLawyer/blob/main/auto-deduce.cpp)查看。

auto的类型推导规则实际上与模板参数推导规则是一致的。这意味着，对于：

```cpp
template<typename T>
void foo(T param);

foo(expr);    // 推导T的过程
auto x = expr; // 推导x的类型的过程
```
`foo(expr)`推导模板参数`T`的过程，与`auto x = expr`中推导`x`类型的过程遵循相同的规则，这个规则主要分为以下三种情形：

- **声明形式为 `auto x = expr`**：
  1. 忽略expr的引用性
  2. 忽略expr的top-level cv限定符
  3. 数组退化为指针
  4. 函数退化为函数指针
  ```cpp
  const int a = 42;
  auto b = a;      // b的类型为int，const被擦除

  const int& c = a;
  auto d = c;      // d的类型为int，const和引用都擦除

  int arr[10];
  auto e = arr;    // e的类型为int*，数组退化为指针

  void foo();
  auto f = foo;    // f的类型为void(*)()，函数退化为函数指针
  ```
- **声明形式为 `auto& x = expr` （引用推导）**。首先毫无疑问，x的类型是引用，而其引用的类型的推导规则是：
  1. 保留expr的cv限定符
  2. 如果expr本身是引用，则使用其引用的底层类型
  3. 不发生数组或函数退化
  ```cpp
  const int a = 42;
  auto& b = a;     // b的类型为const int&

  int& c = a;
  auto& d = c;     // d的类型为int&

  int arr[10];
  auto& e = arr;    // e的类型为int(&)[10]

  void foo();
  auto& f = foo;    // f的类型为void(&)()
  ```
- **声明形式为 `auto&& x = expr` （通用引用推导）**
  
  这种情形要复杂一些。首先，`auto&&`（或者模板参数推导中的`T&&`），是一种通用引用（universal reference），它允许用于匹配的表达式是左值或右值。在类型推导时:
  1. 如果`expr`是左值（假设其类型为`param_t`)，`auto`被推导为左值引用类型，即`param_t&`；
  2. 如果expr是右值，auto被推导为非引用类型，即`param_t`（规则与 `auto& x = expr` 相同）。
  3. 在这之后，在编译器把推导出来的类型带入到`auto&&`或`T&&`中时（不妨想我们这时候获得的*形式上*的类型是`param_t& &&`或`param_t&&`），会发生引用折叠（reference collapsing）。引用折叠的规则其实很简单， 如果我们把折叠前的类型看作引用的引用，那引用折叠的规则是：**如果这两个引用中至少有一个是左值引用，那么折叠后的类型是左值引用，否则是右值引用。** 也就是说，`T&& &&`折叠为`T&&`，`T& &&`折叠为`T&`，`T&& &`折叠为`T&`，`T& &`折叠为`T&`（后两种情形不会出现在`auto&&`的推导中）。
  ```cpp
  int a = 42;
  auto&& b = a;     // a 是左值，auto推导为int&，形式为int& &&，折叠为int&

  int&& rref = 42;     // rref是个右值引用，但它本身是个左值
  auto&& r = rref;     // auto推导为int&，形式为int& &&，折叠为int&

  auto&& c = 42;     // 42是右值，auto推导为int，形式为int&&，折叠保持不变，仍为int&&

  auto&& d = std::move(a);  // std::move(a)是右值，auto推导为int，形式为int&& &&，折叠为int&&
  ```


## 相关阅读
- *Effective Modern C++* by Scott Meyers, Item 2: Understand auto type deduction.
- cppreference.com, [auto specifier](https://en.cppreference.com/w/cpp/language/auto).

## 旁注

<div id="f1">
  <sup>[1]</sup> 
  对于类的成员引用，编译器无法确定如何将临时对象的生命周期安全地延长到整个类对象的生命周期。
  因此：

  ```cpp
    struct S {
        const int& ref;
        S() : ref(42) { }  // 危险：成员引用绑定到临时对象
    };  // 临时对象在构造函数结束时被销毁
  ```
是错误的。<a href="#a1">↩</a>
</div>

