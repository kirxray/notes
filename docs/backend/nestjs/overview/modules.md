---
title: Модули
sidebar_position: 4
---

# Модули

:::info[Оригинал]
[docs.nestjs.com — Modules](https://docs.nestjs.com/modules) · NestJS 12.1 · перевод от 04.10.2026
:::

Модуль — это класс, помеченный декоратором `@Module()`. Декоратор предоставляет метаданные, с помощью которых **Nest** организует структуру приложения и управляет ею.

![Модули](/img/nestjs/modules-1.png#themed)

В каждом Nest-приложении есть хотя бы один модуль — **корневой**. С него Nest начинает строить **граф приложения** — внутреннюю структуру, по которой Nest разрешает связи и зависимости между модулями и провайдерами. В совсем небольшом приложении может быть только корневой модуль, но в большинстве приложений модулей несколько, и каждый из них инкапсулирует набор тесно связанных **возможностей**. Модули — **рекомендуемый** способ организации компонентов.

Декоратор `@Module()` принимает один объект со свойствами, описывающими модуль:

| Свойство      | Описание                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers`   | провайдеры, экземпляры которых создаёт инжектор Nest и которые могут использоваться как минимум в пределах этого модуля                                                                   |
| `controllers` | набор контроллеров, определённых в этом модуле, экземпляры которых нужно создать                                                                                                          |
| `imports`     | список импортируемых модулей, которые экспортируют провайдеры, нужные в этом модуле                                                                                                       |
| `exports`     | подмножество `providers`, которое этот модуль предоставляет и которое должно быть доступно импортирующим его модулям. Можно указать как сам провайдер, так и его токен (значение `provide`) |

По умолчанию модуль **инкапсулирует** свои провайдеры: внедрять можно только провайдеры, входящие в текущий модуль или явно экспортированные импортированным модулем. Экспортируемые провайдеры модуля образуют его публичный интерфейс, или API.

## Функциональные модули {/* #feature-modules */}

В нашем примере `CatsController` и `CatsService` тесно связаны и обслуживают одну предметную область приложения, поэтому их имеет смысл объединить в функциональный модуль (feature module). Функциональный модуль организует код конкретной функциональности и тем самым сохраняет чёткие границы. Это становится всё важнее по мере роста приложения или команды и согласуется с принципами [SOLID](https://en.wikipedia.org/wiki/SOLID).

Создадим `CatsModule`, который объединит контроллер и сервис:

```ts title="cats/cats.module.ts"
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
```

:::tip[Подсказка]
Чтобы создать модуль с помощью CLI, выполните `$ nest g module cats`.
:::

Выше мы определили `CatsModule` в файле `cats.module.ts` и перенесли всё, что к нему относится, в директорию `cats`. Последний шаг — импортировать этот модуль в корневой модуль (`AppModule`, определённый в файле `app.module.ts`):

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module.js';

@Module({
  imports: [CatsModule],
})
export class AppModule {}
```

Структура директорий теперь выглядит так:

```text
src
├── cats
│   ├── dto
│   │   └── create-cat.dto.ts
│   ├── interfaces
│   │   └── cat.interface.ts
│   ├── cats.controller.ts
│   ├── cats.module.ts
│   └── cats.service.ts
├── app.module.ts
└── main.ts
```

## Общие модули {/* #shared-modules */}

В Nest модули по умолчанию являются **синглтонами**, поэтому один и тот же экземпляр любого провайдера можно использовать в нескольких модулях.

![Общие модули](/img/nestjs/shared-module-1.png#themed)

Каждый модуль автоматически является **общим** (shared module): после создания его может повторно использовать любой другой модуль. Предположим, нужно использовать один экземпляр `CatsService` в нескольких других модулях. Для этого сначала **экспортируйте** провайдер `CatsService`, добавив его в массив `exports` модуля:

```ts title="cats.module.ts"
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}
```

Теперь любой модуль, импортирующий `CatsModule`, получает доступ к `CatsService` и использует тот же экземпляр, что и все остальные модули, которые его импортируют.

Можно было бы зарегистрировать `CatsService` напрямую в каждом модуле, где он нужен, но тогда каждый модуль получил бы свой отдельный экземпляр сервиса. Несколько экземпляров увеличивают расход памяти и могут приводить к неожиданному поведению — например, к несогласованному состоянию, если сервис хранит внутреннее состояние.

Если инкапсулировать `CatsService` в модуле вроде `CatsModule` и экспортировать его, все модули, импортирующие `CatsModule`, будут использовать один и тот же экземпляр. Это снижает расход памяти и делает поведение более предсказуемым, поскольку общее состояние и ресурсы управляются в одном месте. Эффективное совместное использование сервисов в приложении — одно из ключевых преимуществ модульности и внедрения зависимостей.

## Реэкспорт модулей {/* #module-re-exporting */}

Как показано выше, модули могут экспортировать свои внутренние провайдеры. Кроме того, они могут реэкспортировать импортируемые модули. В примере ниже `CommonModule` одновременно импортируется в `CoreModule` **и** экспортируется из него, поэтому он становится доступен любому модулю, импортирующему `CoreModule`.

```ts
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

## Внедрение зависимостей {/* #dependency-injection */}

Класс модуля тоже может **внедрять** провайдеры (например, для настройки):

```ts title="cats.module.ts"
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {
  constructor(private catsService: CatsService) {}
}
```

Однако сами классы модулей нельзя внедрять как провайдеры из-за циклических зависимостей{/* TODO-LINK: https://docs.nestjs.com/fundamentals/circular-dependency — Fundamentals → Circular dependency */}.

## Глобальные модули {/* #global-modules */}

Импортировать один и тот же набор модулей повсюду бывает утомительно. В [Angular](https://angular.dev) провайдеры (`providers`) регистрируются в глобальной области видимости и после объявления доступны везде. Nest, напротив, инкапсулирует провайдеры в области видимости модуля: использовать провайдеры модуля в другом месте нельзя, не импортировав сначала модуль, который их инкапсулирует.

Чтобы набор провайдеров был доступен везде «из коробки» (например, хелперы или подключения к базе данных), сделайте модуль **глобальным** с помощью декоратора `@Global()`:

```ts
import { Module, Global } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';

@Global()
@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}
```

Декоратор `@Global()` делает модуль глобальным. Глобальные модули следует регистрировать **только один раз** — обычно в корневом или основном (core) модуле. В примере выше провайдер `CatsService` доступен везде, и модулям, которые его внедряют, не нужно добавлять `CatsModule` в массив `imports`.

:::tip[Подсказка]
Делать глобальным всё подряд — не лучшая практика проектирования. Глобальные модули сокращают шаблонный код, но массив `imports` делает API модуля доступным другим модулям контролируемо и явно. Так структура приложения остаётся поддерживаемой, другим модулям открываются только нужные им части модуля, и не возникает лишней связанности между несвязанными частями приложения.
:::

## Динамические модули {/* #dynamic-modules */}

Динамические модули позволяют создавать модули, которые настраиваются во время выполнения. Они полезны, когда провайдеры модуля зависят от параметров, передаваемых импортирующим его модулем. Например, следующий `FeatureFlagsModule` получает флаги функциональности (feature flags) приложения через статический метод `forRoot()`:

```ts title="feature-flags.module.ts"
import { DynamicModule, Module } from '@nestjs/common';
import { FEATURE_FLAGS } from './feature-flags.constants.js';
import { FeatureFlagsService } from './feature-flags.service.js';

@Module({
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {
  static forRoot(flags: Record<string, boolean>): DynamicModule {
    return {
      module: FeatureFlagsModule,
      providers: [{ provide: FEATURE_FLAGS, useValue: flags }],
    };
  }
}
```

Токен внедрения `FEATURE_FLAGS` — обычная константа (`export const FEATURE_FLAGS = 'FEATURE_FLAGS';`), как описано в разделе «Токены провайдеров, не основанные на классах»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens — Fundamentals → Custom providers → Non-class-based provider tokens */}.

:::tip[Подсказка]
Метод `forRoot()` может возвращать динамический модуль как синхронно, так и асинхронно (то есть через `Promise`).
:::

Свойства, возвращаемые `forRoot()`, **расширяют** (а не переопределяют) метаданные, заданные в декораторе `@Module()`. Поэтому итоговый модуль содержит и статически объявленный `FeatureFlagsService`, и динамически зарегистрированный провайдер `FEATURE_FLAGS`. Поскольку они принадлежат одному модулю, сервис может внедрить флаги:

```ts title="feature-flags.service.ts"
import { Inject, Injectable } from '@nestjs/common';
import { FEATURE_FLAGS } from './feature-flags.constants.js';

@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(FEATURE_FLAGS) private readonly flags: Record<string, boolean>,
  ) {}

  isEnabled(flag: string): boolean {
    return this.flags[flag] ?? false;
  }
}
```

Модуль экспортирует только `FeatureFlagsService`, поэтому сами флаги остаются деталью его реализации.

Импортируйте и настройте `FeatureFlagsModule` так:

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module.js';

@Module({
  imports: [
    FeatureFlagsModule.forRoot({
      newCheckout: true,
      betaDashboard: false,
    }),
  ],
})
export class AppModule {}
```

Внедрять `FeatureFlagsService` может только модуль, который импортирует `FeatureFlagsModule.forRoot()`. Повторный вызов `forRoot()` в другом модуле создаст второй, отдельно настроенный экземпляр. Чтобы использовать один экземпляр, настройте модуль один раз и реэкспортируйте его. Для реэкспорта динамического модуля укажите класс модуля в массиве `exports`, не вызывая `forRoot()` повторно:

```ts title="core.module.ts"
import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module.js';

@Module({
  imports: [
    FeatureFlagsModule.forRoot({
      newCheckout: true,
      betaDashboard: false,
    }),
  ],
  exports: [FeatureFlagsModule],
})
export class CoreModule {}
```

Теперь каждый модуль, импортирующий `CoreModule`, может внедрять `FeatureFlagsService`, и все они используют одни и те же флаги.

Другой вариант — зарегистрировать динамический модуль в глобальной области видимости: для этого установите свойство `global` в `true` в объекте, который возвращает `forRoot()`. Тогда `FeatureFlagsService` можно будет внедрять где угодно без импорта каких-либо модулей:

```ts
return {
  global: true,
  module: FeatureFlagsModule,
  providers: [{ provide: FEATURE_FLAGS, useValue: flags }],
};
```

:::warning[Внимание]
Как уже говорилось, делать глобальным всё подряд — **не лучшее проектное решение**.
:::

Для параметров, известных только во время выполнения (например, значений, которые читает `ConfigService`), нужен асинхронный вариант `forRoot()`. Об этом и многом другом рассказывается в главе «Динамические модули»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/dynamic-modules — Fundamentals → Dynamic modules */}.

:::tip[Подсказка]
Как создавать гибко настраиваемые динамические модули с помощью `ConfigurableModuleBuilder`, читайте в разделе «Конструктор настраиваемых модулей»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/dynamic-modules#configurable-module-builder — Fundamentals → Dynamic modules → Configurable module builder */}.
:::
