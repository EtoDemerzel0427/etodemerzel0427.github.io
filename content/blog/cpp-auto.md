+++
date = "2023-11-01T00:34:00-05:00"
title = "A Brief Discussion on C++ auto"
description = "Analysis of Usage and Type Deduction Rules"
lang = "en"
slug = "cpp-auto"
draft = false


[extra]
    image = { path = "images/cpp-history.png", alt = "code-img", visible_in_page = true, visible_in_section = true }
    page_identifier = "decltype-auto"
+++

> This English vesion is a translation of the original Chinese article. It is translated by ChatGPT w/o any human proofreading. If you find any mistakes, please let me know.

The `auto` keyword has actually existed since the C language, where it was used to indicate that a variable had [automatic storage duration](https://en.cppreference.com/w/cpp/language/storage_duration), meaning that the variable is created when the block of code in which it is declared is entered and destroyed when that block is exited. However, since this is the default behavior for local variables, it was rarely used. Bjarne Stroustrup, the father of C++, cleverly repurposed this existing keyword in C++11 and gave it a new meaning: **automatic type deduction**. `auto` is very useful when dealing with complex types (such as various iterators) and variables that are difficult or even impossible to write out precisely (such as lambdas).
<!--more-->

## Basic Syntax

The `auto` keyword allows the compiler to automatically deduce the type of a variable based on the initialization expression. Here are some basic usage examples:

1. Direct deduction from a value:
   ```cpp
   auto x = 3.14; // x is of type double
   auto y = 42;   // y is of type int
   auto z(1);     // z is of type int
   ```
2. Deduction from an expression:
   ```cpp
   int foo();
   auto x1 = foo(); // x1 : int
   ```
3. Deduction involving cv-qualifiers, references, or pointers:
   ```cpp
   const auto& x2 = foo(); // x2 : const int& 
   auto& x3 = foo(); // x3 : int& - Error, cannot bind reference to temporary object

   float& bar();
   auto y1 = bar(); // y1 : float
   const auto& y2 = bar(); // y2 : const float& 
   auto& y3 = bar(); // y3 : float&

   A* fii();
   auto* z1 = fii(); // z1 : A*
   auto z2 = fii(); // z2 : A*
   auto* z3 = bar(); // Error, bar does not return a pointer type
   ```
   From the above examples, the type deduction rules of `auto` start to become apparent, which we will discuss in detail in the next section. It is also worth noting that const references can bind to temporary objects (`const auto& x2 = foo()`), whereas non-const references cannot. Semantically, modifying a temporary object makes no sense; in terms of lifespan, allowing non-const references to bind to temporaries would result in dangling references after the temporary object is destroyed, whereas const references extend the temporary object's lifespan to match the reference's.<sup id="a1">[1](#f1)</sup>
4. Multiple variable declarations:
   ```cpp
   // Multiple variable declarations
   auto a = 1, *b = &a; // Valid, declarations are processed from left to right
   auto x = 1, *y = &x; // Also valid, declarations are processed from left to right
   auto m = 1, y = 3.14; // Error, types are not compatible
   ```
   In multiple variable declarations, the type of `auto` is deduced from the first declaration, and subsequent declarations must be compatible. This is because declarations are processed from left to right.
5. Use in dynamic allocation:
    ```cpp
    auto* p = new auto(1);  // Using auto in dynamic allocation
    ```
    This is an uncommon but valid syntax.

## Type Deduction Rules

> The code covered in this section can be found [here](https://github.com/EtoDemerzel0427/LangLawyer/blob/main/auto-deduce.cpp).

The type deduction rules of `auto` are actually consistent with the template parameter deduction rules. This means that, for:

```cpp
template<typename T>
void foo(T param);

foo(expr);    // Deduction process of T
auto x = expr; // Deduction process of the type of x
```
The process of deducing the template parameter `T` in `foo(expr)` follows the same rules as the process of deducing the type of `x` in `auto x = expr`. These rules can be divided into the following three cases:

- **Declaration of the form `auto x = expr`**:
  1. Discard reference qualification of `expr`
  2. Discard top-level `const` qualifier of `expr`
  3. Arrays decay to pointers
  4. Functions decay to function pointers
  ```cpp
  const int a = 42;
  auto b = a;      // b is of type int, const is discarded

  const int& c = a;
  auto d = c;      // d is of type int, both const and reference are discarded

  int arr[10];
  auto e = arr;    // e is of type int*, array decays to pointer

  void foo();
  auto f = foo;    // f is of type void(*)(), function decays to function pointer
  ```
- **Declaration of the form `auto& x = expr` (reference deduction)**: It is obvious that `x` is of reference type, and the rules for deducing the type of the reference are:
  1. Keep the `const` qualifier of `expr`
  2. If `expr` itself is a reference, use its underlying type
  3. No array or function decay occurs
  ```cpp
  const int a = 42;
  auto& b = a;     // b is of type const int&

  int& c = a;
  auto& d = c;     // d is of type int&

  int arr[10];
  auto& e = arr;    // e is of type int(&)[10]

  void foo();
  auto& f = foo;    // f is of type void(&)()
  ```
- **Declaration of the form `auto&& x = expr` (universal reference deduction)**
  
  This case is a bit more complex. First of all, `auto&&` (or `T&&` in template parameter deduction) is a universal reference, meaning it can match an lvalue or an rvalue. During type deduction:
  1. If `expr` is an lvalue (assuming its type is `param_t`), `auto` is deduced as `param_t&` (a left reference).
  2. If `expr` is an rvalue, `auto` is deduced as a non-reference type, i.e., `param_t` (following the same rules as `auto& x = expr`).
  3. After this, when the compiler substitutes the deduced type into `auto&&` or `T&&` (imagine we get a type of `param_t& &&` or `param_t&&`), reference collapsing occurs. The rule for reference collapsing is quite simple: **if at least one of the two references is an lvalue reference, the result is an lvalue reference; otherwise, it is an rvalue reference**. This means that `T&& &&` collapses to `T&&`, `T& &&` collapses to `T&`, `T&& &` collapses to `T&`, and `T& &` collapses to `T&` (the latter two cases do not appear in `auto&&` deduction).
  ```cpp
  int a = 42;
  auto&& b = a;     // a is an lvalue, auto is deduced as int&, resulting in int& &&, which collapses to int&

  int&& rref = 42;     // rref is an rvalue reference, but it itself is an lvalue
  auto&& r = rref;     // auto is deduced as int&, resulting in int& &&, which collapses to int&

  auto&& c = 42;     // 42 is an rvalue, auto is deduced as int, resulting in int&&

  auto&& d = std::move(a);  // std::move(a) is an rvalue, auto is deduced as int, resulting in int&& &&, which collapses to int&&
  ```

## Further Reading
- *Effective Modern C++* by Scott Meyers, Item 2: Understand auto type deduction.
- cppreference.com, [auto specifier](https://en.cppreference.com/w/cpp/language/auto).

## Footnotes

<div id="f1">
  <sup>[1]</sup> 
  For class member references, the compiler cannot safely extend the lifetime of a temporary object to the lifetime of the entire class object. Therefore:

  ```cpp
    struct S {
        const int& ref;
        S() : ref(42) { }  // Dangerous: member reference binds to a temporary object
    };  // The temporary object is destroyed when the constructor ends
  ```
is incorrect. <a href="#a1">↩</a>
</div>

