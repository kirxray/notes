---
title: Пользовательские провайдеры
sidebar_position: 1
---

# Пользовательские провайдеры

:::info[Оригинал]
[docs.nestjs.com — Custom providers](https://docs.nestjs.com/fundamentals/custom-providers) · NestJS 12.1 · перевод от 04.10.2026
:::

В предыдущих главах мы касались разных аспектов **внедрения зависимостей (dependency injection, DI)** и того, как его использует Nest. Один из примеров — внедрение зависимостей [через конструктор](../overview/providers.md#dependency-injection), при котором в классы внедряются экземпляры (чаще всего провайдеры-сервисы). Внедрение зависимостей встроено в ядро Nest на фундаментальном уровне. До сих пор мы рассмотрели только один основной паттерн. По мере усложнения приложения вам может понадобиться весь набор возможностей системы DI, поэтому в этой главе мы разберём её подробнее.

## Основы DI {/* #di-fundamentals */}

Внедрение зависимостей — это техника [инверсии управления (IoC)](https://en.wikipedia.org/wiki/Inversion_of_control) (на английском), при которой создание зависимостей делегируется IoC-контейнеру (в нашем случае — системе выполнения NestJS), а не выполняется императивно в вашем коде. Посмотрим, что происходит в этом примере из главы [«Провайдеры»](../overview/providers.md).

Сначала определяем провайдер. Декоратор `@Injectable()` помечает класс `CatsService` как провайдер.

```ts title="cats.service.ts"
import { Injectable } from '@nestjs/common';
import type { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  findAll(): Cat[] {
    return this.cats;
  }
}
```

Затем просим Nest внедрить провайдер в класс контроллера:

```ts title="cats.controller.ts"
import { Controller, Get } from '@nestjs/common';
import { CatsService } from './cats.service.js';
import type { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```

Наконец, регистрируем провайдер в IoC-контейнере Nest:

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

Всё это работает благодаря трём ключевым шагам:

1. В `cats.service.ts` декоратор `@Injectable()` объявляет `CatsService` классом, которым может управлять IoC-контейнер Nest.
2. В `cats.controller.ts` класс `CatsController` объявляет зависимость от токена `CatsService` через внедрение в конструктор:

   ```ts
     constructor(private catsService: CatsService)
   ```

3. В `app.module.ts` мы связываем токен `CatsService` с классом `CatsService` из файла `cats.service.ts`. Как именно происходит эта связь (её также называют _регистрацией_), показано ниже в разделе [«Стандартные провайдеры»](#standard-providers).

Когда IoC-контейнер Nest создаёт экземпляр `CatsController`, он сначала ищет все его зависимости\*. Найдя зависимость `CatsService`, он ищет токен `CatsService`, который, согласно шагу регистрации (№ 3 выше), возвращает класс `CatsService`. При области видимости `SINGLETON` (по умолчанию) Nest затем либо создаёт экземпляр `CatsService`, кеширует его и возвращает, либо, если экземпляр уже есть в кеше, возвращает существующий.

\*Это объяснение упрощено для наглядности. На самом деле анализ кода на зависимости — сложный процесс, который происходит при запуске приложения. Его важное свойство — анализ зависимостей (или «построение графа зависимостей») **транзитивен**: если бы в примере выше у самого `CatsService` были зависимости, они тоже были бы разрешены. Граф зависимостей гарантирует, что зависимости разрешаются в правильном порядке — по сути «снизу вверх». Благодаря этому механизму вам не приходится самостоятельно управлять сложными графами зависимостей.

## Стандартные провайдеры {/* #standard-providers */}

Присмотримся к декоратору `@Module()`. В `app.module` мы объявляем:

```ts
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
```

Свойство `providers` принимает массив провайдеров. До сих пор мы передавали их списком имён классов. На самом деле запись `providers: [CatsService]` — сокращение более полного синтаксиса:

```ts
providers: [
  {
    provide: CatsService,
    useClass: CatsService,
  },
];
```

Эта явная конструкция показывает процесс регистрации: она связывает токен `CatsService` с классом `CatsService`. Сокращённая запись — удобство для самого частого случая, когда токен используется, чтобы запросить экземпляр одноимённого класса.

## Пользовательские провайдеры {/* #custom-providers */}

Иногда требования выходят за рамки того, что дают _стандартные провайдеры_. Например:

- Нужно создать собственный экземпляр, а не поручать Nest создание экземпляра класса (или возврат закешированного).
- Нужно переиспользовать существующий класс во второй зависимости.
- Нужно подменить класс mock-версией для тестирования.

Nest позволяет определять пользовательские провайдеры для таких случаев и предлагает несколько способов их определения. В следующих разделах разберём каждый из них.

:::tip[Подсказка]
Если возникают проблемы с разрешением зависимостей, установите переменную окружения `NEST_DEBUG`, чтобы получать при запуске дополнительные логи разрешения зависимостей.
:::

## Провайдеры значений: `useValue` {/* #value-providers-usevalue */}

Синтаксис `useValue` удобен, чтобы внедрить константное значение, поместить внешнюю библиотеку в контейнер Nest или заменить реальную реализацию mock-объектом. Например, пусть нужно, чтобы Nest использовал mock `CatsService` для тестирования:

```ts
import { CatsService } from './cats.service.js';

const mockCatsService = {
  /* mock-реализация
  ...
  */
};

@Module({
  imports: [CatsModule],
  providers: [
    {
      provide: CatsService,
      useValue: mockCatsService,
    },
  ],
})
export class AppModule {}
```

В этом примере токен `CatsService` разрешается в mock-объект `mockCatsService`. `useValue` требует значение — в данном случае литерал объекта с тем же интерфейсом, что и у заменяемого класса `CatsService`. Благодаря [структурной типизации](https://www.typescriptlang.org/docs/handbook/type-compatibility.html) (на английском) TypeScript можно использовать любой объект с совместимым интерфейсом, в том числе литерал объекта или экземпляр класса, созданный через `new`.

## Токены провайдеров, не основанные на классах {/* #non-class-based-provider-tokens */}

До сих пор в качестве токенов провайдеров (значения свойства `provide` у провайдера из массива `providers`) мы использовали имена классов. Это соответствует стандартному паттерну [внедрения через конструктор](../overview/providers.md#dependency-injection), где токеном тоже служит имя класса. (Напомнить себе, что такое токены, можно в разделе [«Основы DI»](#di-fundamentals).) Иногда нужна гибкость — использовать в качестве DI-токенов строки или символы. Например:

```ts
import { connection } from './connection.js';

@Module({
  providers: [
    {
      provide: 'CONNECTION',
      useValue: connection,
    },
  ],
})
export class AppModule {}
```

В этом примере мы связываем строковый токен (`'CONNECTION'`) с уже существующим объектом `connection`, импортированным из внешнего файла.

:::warning[Внимание]
Помимо строк, в качестве значений токенов можно использовать [символы](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol) (на английском) JavaScript или [перечисления (enums)](https://www.typescriptlang.org/docs/handbook/enums.html) (на английском) TypeScript.
:::

Стандартный паттерн [внедрения через конструктор](../overview/providers.md#dependency-injection) **требует**, чтобы зависимость была объявлена через имя класса. Однако пользовательский провайдер `'CONNECTION'` использует строковый токен. Чтобы внедрить такой провайдер, используйте декоратор `@Inject()`, который принимает единственный аргумент — токен.

```ts
@Injectable()
export class CatsRepository {
  constructor(@Inject('CONNECTION') connection: Connection) {}
}
```

:::tip[Подсказка]
Декоратор `@Inject()` импортируется из пакета `@nestjs/common`.
:::

В примерах выше строка `'CONNECTION'` используется напрямую для наглядности. Для аккуратной организации кода определяйте токены в отдельном файле, например `constants.ts`, и импортируйте их там, где они нужны, — так же, как символы или перечисления.

## Интерфейсы и абстрактные классы {/* #interfaces-and-abstract-classes */}

Типы и интерфейсы TypeScript стираются при компиляции, поэтому Nest не может ссылаться на них во время выполнения. Интерфейс может описывать форму зависимости, но сам по себе не может служить DI-токеном.

Поскольку Nest разрешает провайдеры по токенам времени выполнения, при регистрации провайдера для интерфейса используйте строковый токен или `Symbol`:

```ts
export interface LoggerService {
  log(message: string): void;
}

export const LOGGER_SERVICE = Symbol('LOGGER_SERVICE');

@Injectable()
export class PinoLoggerService implements LoggerService {
  log(message: string) {
    // детали реализации
  }
}

@Module({
  providers: [
    {
      provide: LOGGER_SERVICE,
      useClass: PinoLoggerService,
    },
  ],
})
export class AppModule {}
```

Чтобы внедрить этот провайдер, передайте этот токен в декоратор `@Inject()`:

```ts
@Injectable()
export class CatsService {
  constructor(
    @Inject(LOGGER_SERVICE)
    private readonly logger: LoggerService,
  ) {}
}
```

Абстрактные классы, в отличие от интерфейсов, существуют во время выполнения. Абстрактный класс можно использовать одновременно и как контракт TypeScript, и как DI-токен:

```ts
export abstract class LoggerService {
  abstract log(message: string): void;
}

@Injectable()
export class PinoLoggerService implements LoggerService {
  log(message: string) {
    // детали реализации
  }
}

@Module({
  providers: [
    {
      provide: LoggerService,
      useClass: PinoLoggerService,
    },
  ],
})
export class AppModule {}
```

С токеном-абстрактным классом внедрение через конструктор использует тип абстрактного класса напрямую и не требует `@Inject()`:

```ts
@Injectable()
export class CatsService {
  constructor(private readonly logger: LoggerService) {}
}
```

Используйте строковые токены или `Symbol`, когда DI-токен времени выполнения должен быть отвязан от класса. Токены-`Symbol` особенно полезны в библиотеках и крупных приложениях: у каждого символа уникальная идентичность во время выполнения, что исключает случайные коллизии, которые возможны, когда несвязанные провайдеры используют одну и ту же строку в качестве токена. Используя токен-символ, экспортируйте его из общего файла и переиспользуйте один и тот же экземпляр символа везде, где провайдер регистрируется и внедряется. Используйте абстрактный класс, когда одна сущность должна быть и контрактом, и токеном времени выполнения, а вам нужно более простое внедрение через конструктор. Обычный интерфейс остаётся хорошим выбором, когда тип нужен только для проверки на этапе компиляции и DI-токен не требуется.

## Провайдеры классов: `useClass` {/* #class-providers-useclass */}

Синтаксис `useClass` позволяет динамически определять класс, в который разрешается токен. Например, пусть у нас есть абстрактный (или используемый по умолчанию) класс `ConfigService`, и мы хотим, чтобы Nest предоставлял разные реализации сервиса конфигурации в зависимости от текущего окружения. Следующий код реализует эту стратегию:

```ts
const configServiceProvider = {
  provide: ConfigService,
  useClass:
    process.env.NODE_ENV === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}
```

В этом примере стоит отметить две детали. Во-первых, мы определяем `configServiceProvider` как литерал объекта, а затем передаём его в свойство `providers` декоратора модуля. Это лишь организация кода: функционально это равнозначно примерам, которые мы использовали в этой главе до сих пор.

Во-вторых, в качестве токена мы используем имя класса `ConfigService`. Для любого класса, зависящего от `ConfigService`, Nest внедрит экземпляр предоставленного класса (`DevelopmentConfigService` или `ProductionConfigService`), переопределив реализацию по умолчанию, которая могла быть объявлена в другом месте (например, `ConfigService`, объявленный с декоратором `@Injectable()`).

## Провайдеры-фабрики: `useFactory` {/* #factory-providers-usefactory */}

Синтаксис `useFactory` позволяет создавать провайдеры **динамически**. Значение провайдера — это то, что вернёт фабричная функция. Фабричная функция может быть сколь угодно простой или сложной. Простая фабрика может не зависеть ни от каких других провайдеров. Более сложная фабрика может внедрять провайдеры, нужные ей для вычисления результата. Для второго случая у синтаксиса провайдера-фабрики есть пара связанных механизмов:

1. Фабричная функция может принимать (необязательные) аргументы.
2. (Необязательное) свойство `inject` принимает массив провайдеров, которые Nest разрешает и передаёт фабричной функции в качестве аргументов при создании экземпляра. Эти провайдеры можно также пометить как необязательные. Два списка соотносятся друг с другом: Nest передаёт экземпляры из списка `inject` в фабричную функцию как аргументы в том же порядке. Пример ниже это демонстрирует.

```ts
const connectionProvider = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: MyOptionsProvider, optionalProvider?: string) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [MyOptionsProvider, { token: 'SomeOptionalProvider', optional: true }],
  //       \______________/             \__________________/
  //        Этот провайдер               Провайдер с этим токеном
  //        обязателен.                  может разрешиться в `undefined`.
};

@Module({
  providers: [
    connectionProvider,
    MyOptionsProvider, // провайдер на основе класса
    // { provide: 'SomeOptionalProvider', useValue: 'anything' },
  ],
})
export class AppModule {}
```

## Провайдеры-псевдонимы: `useExisting` {/* #alias-providers-useexisting */}

Синтаксис `useExisting` позволяет создавать псевдонимы для существующих провайдеров — так к одному и тому же провайдеру можно обращаться двумя способами. В примере ниже (строковый) токен `'AliasedLoggerService'` — псевдоним для токена `LoggerService` (на основе класса). Предположим, у нас две разные зависимости: одна от `'AliasedLoggerService'`, другая от `LoggerService`. Если обе объявлены с областью видимости `SINGLETON`, они разрешатся в один и тот же экземпляр.

```ts
@Injectable()
class LoggerService {
  /* детали реализации */
}

const loggerAliasProvider = {
  provide: 'AliasedLoggerService',
  useExisting: LoggerService,
};

@Module({
  providers: [LoggerService, loggerAliasProvider],
})
export class AppModule {}
```

## Провайдеры, не являющиеся сервисами {/* #non-service-based-providers */}

Провайдеры часто предоставляют сервисы, но этим не ограничиваются. Провайдер может предоставлять **любое** значение. Например, провайдер может предоставлять объект конфигурации в зависимости от текущего окружения:

```ts
const configFactory = {
  provide: 'CONFIG',
  useFactory: () => {
    return process.env.NODE_ENV === 'development' ? devConfig : prodConfig;
  },
};

@Module({
  providers: [configFactory],
})
export class AppModule {}
```

## Экспорт пользовательского провайдера {/* #export-custom-provider */}

Как и любой провайдер, пользовательский провайдер ограничен областью видимости модуля, в котором объявлен. Чтобы сделать его видимым для других модулей, его нужно экспортировать — либо по токену, либо полным объектом провайдера.

В следующем примере провайдер экспортируется по токену:

```ts
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: ['CONNECTION'],
})
export class AppModule {}
```

Либо можно экспортировать полный объект провайдера:

```ts
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: [connectionFactory],
})
export class AppModule {}
```
