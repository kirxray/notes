---
title: Провайдеры
sidebar_position: 3
---

# Провайдеры

:::info[Оригинал]
[docs.nestjs.com — Providers](https://docs.nestjs.com/providers) · NestJS 12.1 · перевод от 01.10.2026
:::

Провайдеры — одна из ключевых концепций Nest. Многие базовые классы Nest, например сервисы, репозитории, фабрики и хелперы, можно рассматривать как провайдеры. Главная идея провайдера в том, что его можно **внедрить** как зависимость, благодаря чему объекты могут образовывать связи друг с другом. «Связыванием» этих объектов занимается среда выполнения Nest.

![Провайдеры](/img/nestjs/providers-1.png#themed)

В предыдущей главе мы создали простой `CatsController`. Контроллеры должны обрабатывать HTTP-запросы и делегировать более сложные задачи **провайдерам**. В простейшем виде провайдеры — это обычные JavaScript-классы, перечисленные в массиве `providers` модуля. Подробнее — в главе [«Модули»](./modules.md).

:::tip[Подсказка]
Nest позволяет проектировать и организовывать зависимости в объектно-ориентированном стиле, поэтому хорошей практикой будет следовать [принципам SOLID](https://en.wikipedia.org/wiki/SOLID).
:::

## Сервисы {/* #services */}

Начнём с создания `CatsService`. Этот сервис отвечает за хранение и получение данных для `CatsController`. Поскольку он инкапсулирует логику приложения, это естественный кандидат в провайдеры.

```ts title="cats.service.ts"
import { Injectable } from '@nestjs/common';
import type { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}
```

:::tip[Подсказка]
Чтобы создать сервис с помощью CLI, выполните `$ nest g service cats`.
:::

`CatsService` — простой класс с одним свойством и двумя методами. Главное здесь — декоратор `@Injectable()`. Он прикрепляет к классу метаданные, объявляя, что `CatsService` может управляться [IoC](https://en.wikipedia.org/wiki/Inversion_of_control)-контейнером Nest.

В примере также используется интерфейс `Cat`:

```ts title="interfaces/cat.interface.ts"
export interface Cat {
  name: string;
  age: number;
  breed: string;
}
```

Теперь, когда у нас есть сервис для хранения и получения котов, используем его в `CatsController`:

```ts title="cats.controller.ts"
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { CatsService } from './cats.service.js';
import type { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```

`CatsService` **внедряется** через конструктор класса. В следующем разделе объясняется, как Nest его находит.

## Внедрение зависимостей {/* #dependency-injection */}

Nest построен вокруг паттерна проектирования **внедрение зависимостей** (dependency injection, DI). Введение в эту концепцию — в [документации Angular](https://angular.dev/guide/di) (на английском).

Nest разрешает зависимости по их типу. В примере ниже Nest разрешает `catsService`, подставляя экземпляр `CatsService`. При области видимости по умолчанию (singleton) Nest создаёт экземпляр один раз и передаёт его всем классам, которые от него зависят. Затем Nest передаёт экземпляр в конструктор контроллера:

```ts
constructor(private catsService: CatsService) {}
```

Эта одна строка делает две вещи:

- Ключевое слово `private` делает `catsService` **параметром-свойством** (parameter property) TypeScript: оно объявляет в классе поле `catsService` и присваивает ему аргумент конструктора, так что писать `this.catsService = catsService` самому не нужно.
- По аннотации типа `CatsService` Nest и выполняет разрешение. При компиляции TypeScript записывает типы параметров конструктора в метаданные, а контейнер читает эти метаданные, чтобы понять, какой провайдер подставить.

:::warning[Внимание]
Поскольку разрешение опирается на записанный тип, аннотация должна ссылаться на то, что существует во время выполнения, то есть на **класс**. Интерфейсы и псевдонимы типов при компиляции стираются. Если `AppConfig` — интерфейс, то в `constructor(private config: AppConfig)` у Nest не будет токена для поиска, и приложение упадёт при запуске с ошибкой «Nest can't resolve dependencies». То же самое произойдёт, если импортировать класс через `import type`, потому что такой импорт тоже стирается. Чтобы внедрить что-то, что не является классом, зарегистрируйте это под токеном и внедрите явно через `@Inject()`, как описано в главе «Пользовательские провайдеры»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/custom-providers#interfaces-and-abstract-classes — Fundamentals → Custom providers → Interfaces and abstract classes */}.
:::

## Области видимости {/* #scopes */}

По умолчанию время жизни провайдера («область видимости», scope) совпадает с жизненным циклом приложения. При запуске приложения Nest разрешает все зависимости, то есть создаются экземпляры всех провайдеров. Аналогично при завершении работы приложения все провайдеры уничтожаются. Провайдеру можно задать и другую область видимости — например, сделать его **привязанным к запросу** (request-scoped), чтобы его время жизни было связано с отдельным запросом. Подробнее — в главе «Области внедрения»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/injection-scopes — Fundamentals → Injection scopes */}.

## Пользовательские провайдеры {/* #custom-providers */}

В Nest есть встроенный контейнер инверсии управления (IoC), который управляет связями между провайдерами. Контейнер лежит в основе внедрения зависимостей и поддерживает не только показанные выше провайдеры на основе классов: провайдеры можно также определять через обычные значения, классы и синхронные или асинхронные фабрики. Примеры — в главе «Пользовательские провайдеры»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/custom-providers — Fundamentals → Custom providers */}.

## Необязательные провайдеры {/* #optional-providers */}

Некоторые зависимости нужны не всегда. Например, класс может зависеть от **объекта конфигурации**, но использовать значения по умолчанию, если он не передан. Такая зависимость необязательна, и её отсутствие не должно приводить к ошибке.

Чтобы пометить зависимость как необязательную, примените декоратор `@Optional()` к параметру конструктора:

```ts
import { Injectable, Optional, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  constructor(@Optional() @Inject('HTTP_OPTIONS') private httpClient: T) {}
}
```

В этом примере внедряется пользовательский провайдер, поэтому в `@Inject()` передаётся пользовательский **токен** `HTTP_OPTIONS`. В предыдущих примерах использовалось внедрение через конструктор, где каждая зависимость определяется своим классом в сигнатуре конструктора. Подробнее о пользовательских провайдерах и их токенах — в главе «Пользовательские провайдеры»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/custom-providers — Fundamentals → Custom providers */}.

`@Optional()` влияет только на то, что происходит, когда провайдер _отсутствует_: если под `HTTP_OPTIONS` ничего не зарегистрировано, Nest внедрит `undefined` вместо того, чтобы упасть при запуске. Поэтому за запасной вариант отвечает сам класс — обычно он накладывает внедрённое значение (если оно есть) поверх набора значений по умолчанию.

## Внедрение через свойства {/* #property-based-injection */}

До сих пор в примерах использовалось внедрение через конструктор, когда провайдеры внедряются через конструктор. В некоторых случаях удобнее **внедрение через свойства**. Например, если базовый класс зависит от одного или нескольких провайдеров, передавать их через `super()` из каждого подкласса становится утомительно. Вместо этого можно применить декоратор `@Inject()` прямо к свойству:

```ts
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  @Inject('HTTP_OPTIONS')
  private readonly httpClient: T;
}
```

:::warning[Внимание]
Если ваш класс не наследуется от другого класса, отдавайте предпочтение внедрению **через конструктор**. Конструктор явно показывает, какие зависимости нужны классу, поэтому такой код проще читать, чем свойства с аннотацией `@Inject()`.
:::

## Регистрация провайдеров {/* #provider-registration */}

Когда есть провайдер (`CatsService`) и потребитель (`CatsController`), нужно зарегистрировать сервис в Nest, чтобы тот мог выполнить внедрение. Для этого добавьте сервис в массив `providers` декоратора `@Module()` в файле модуля (`app.module.ts`):

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller.js';
import { CatsService } from './cats/cats.service.js';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class AppModule {}
```

Теперь Nest может разрешить зависимости класса `CatsController`.

Структура директорий теперь выглядит так:

```text
src
├── cats
│   ├── dto
│   │   └── create-cat.dto.ts
│   ├── interfaces
│   │   └── cat.interface.ts
│   ├── cats.controller.ts
│   └── cats.service.ts
├── app.module.ts
└── main.ts
```

## Ручное создание экземпляров {/* #manual-instantiation */}

До сих пор Nest разрешал зависимости автоматически. Иногда может понадобиться выйти за рамки системы внедрения зависимостей и получать или создавать провайдеры вручную. Для этого есть два приёма:

- Чтобы получать существующие экземпляры или динамически создавать провайдеры, используйте `ModuleRef` — он описан в главе «Ссылка на модуль»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/module-ref — Fundamentals → Module reference */}.
- Чтобы получать провайдеры внутри функции `bootstrap()` (например, в standalone-приложениях или чтобы использовать сервис конфигурации во время запуска), см. главу «Standalone-приложения»{/* TODO-LINK: https://docs.nestjs.com/standalone-applications — Standalone apps */}.
