---
title: Middleware
sidebar_position: 5
---

# Middleware

:::info[Оригинал]
[docs.nestjs.com — Middleware](https://docs.nestjs.com/middleware) · NestJS 12.1 · перевод от 04.10.2026
:::

Middleware (промежуточное ПО) — это функция, которая вызывается **перед** обработчиком маршрута. Функции middleware имеют доступ к объектам [запроса](https://expressjs.com/en/4x/api.html#req) и [ответа](https://expressjs.com/en/4x/api.html#res), а также к функции `next()` — следующей middleware в цикле «запрос — ответ» приложения. Следующую middleware обычно обозначают переменной с именем `next`.

![Middleware](/img/nestjs/middlewares-1.png#themed)

По умолчанию middleware в Nest эквивалентны middleware [Express](https://expressjs.com/en/guide/using-middleware.html) (на английском). Официальная документация Express описывает возможности middleware так:

> Функции middleware могут выполнять следующие задачи:
>
> - выполнять любой код;
> - вносить изменения в объекты запроса и ответа;
> - завершать цикл «запрос — ответ»;
> - вызывать следующую функцию middleware в стеке;
> - если текущая функция middleware не завершает цикл «запрос — ответ», она должна вызвать `next()`, чтобы передать управление следующей функции middleware. Иначе запрос «зависнет».

Собственную middleware в Nest можно реализовать либо как функцию, либо как класс с декоратором `@Injectable()`. Класс должен реализовывать интерфейс `NestMiddleware`, а к функции никаких особых требований нет. Начнём с реализации простого класса middleware.

:::warning[Внимание]
Express и Fastify обрабатывают middleware по-разному и предоставляют разные сигнатуры методов. Подробнее — в главе «Производительность (Fastify)»{/* TODO-LINK: https://docs.nestjs.com/http/performance#middleware — HTTP → Performance (Fastify) → Middleware */}.
:::

```ts title="logger.middleware.ts"
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('Request...');
    next();
  }
}
```

## Внедрение зависимостей {/* #dependency-injection */}

Middleware в Nest полностью поддерживают внедрение зависимостей. Как и провайдеры с контроллерами, классы middleware могут **внедрять зависимости**, доступные в том же модуле. Как обычно, зависимости внедряются через `constructor`.

## Подключение middleware {/* #applying-middleware */}

Middleware не регистрируются в декораторе `@Module()`. Вместо этого их настраивают в методе `configure()` класса модуля. Модули, подключающие middleware, должны реализовывать интерфейс `NestModule`. Подключим `LoggerMiddleware` на уровне `AppModule`.

```ts title="app.module.ts"
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { CatsModule } from './cats/cats.module.js';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('cats');
  }
}
```

В примере выше `LoggerMiddleware` применяется к обработчикам маршрута `/cats`, определённым в `CatsController`. Чтобы ограничить middleware определённым методом запроса, передайте в метод `forRoutes()` объект с путём маршрута (`path`) и методом запроса (`method`). В примере ниже импортируется перечисление `RequestMethod`, чтобы указать нужный метод.

```ts title="app.module.ts"
import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { CatsModule } from './cats/cats.module.js';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: 'cats', method: RequestMethod.GET });
  }
}
```

:::tip[Подсказка]
Метод `configure()` может быть асинхронным. Объявите его с `async`, чтобы дожидаться (`await`) завершения асинхронных операций в теле метода.
:::

:::warning[Внимание]
При использовании адаптера Express Nest по умолчанию регистрирует парсеры тела запроса `json` и `urlencoded` (`express.json()` и `express.urlencoded()`). Чтобы настроить эти парсеры через `MiddlewareConsumer`, отключите стандартные, установив опцию `bodyParser` в `false` при создании приложения через `NestFactory.create()`.
:::

## Шаблоны маршрутов {/* #route-wildcards */}

Middleware поддерживают и маршруты на основе шаблонов. Например, именованный подстановочный символ (`*splat`) соответствует любой последовательности символов в маршруте. В следующем примере middleware срабатывает для любого маршрута, начинающегося с `abcd/`, независимо от количества символов после него.

```ts
forRoutes({
  path: 'abcd/*splat',
  method: RequestMethod.ALL,
});
```

:::tip[Подсказка]
`splat` — это лишь имя параметра подстановки, особого смысла у него нет. Можно использовать любое имя, например `*wildcard`.
:::

Путь `'abcd/*splat'` соответствует `abcd/1`, `abcd/123`, `abcd/abc` и так далее. В строковых путях дефис (`-`) и точка (`.`) трактуются буквально. Однако `abcd/` без дополнительных символов этому пути не соответствует. Чтобы он тоже подходил, оберните подстановку в фигурные скобки — так она станет необязательной:

```ts
forRoutes({
  path: 'abcd/{*splat}',
  method: RequestMethod.ALL,
});
```

## MiddlewareConsumer {/* #middleware-consumer */}

`MiddlewareConsumer` — вспомогательный класс с несколькими встроенными методами для управления middleware. Все их можно вызывать **цепочкой** в [fluent-стиле](https://en.wikipedia.org/wiki/Fluent_interface). Метод `forRoutes()` принимает одну строку, несколько строк, объект `RouteInfo`, класс контроллера или несколько классов контроллеров. Чаще всего передают список **контроллеров** через запятую. Пример с одним контроллером:

```ts title="app.module.ts"
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { CatsModule } from './cats/cats.module.js';
import { CatsController } from './cats/cats.controller.js';

@Module({
  imports: [CatsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(CatsController);
  }
}
```

:::tip[Подсказка]
Метод `apply()` принимает либо одну middleware, либо несколько аргументов, чтобы задать [несколько middleware](#multiple-middleware).
:::

## Исключение маршрутов {/* #excluding-routes */}

Чтобы **исключить** некоторые маршруты из обработки middleware, используйте метод `exclude()`. Он принимает одну строку, несколько строк или объект `RouteInfo`, определяющий исключаемые маршруты:

```ts
consumer
  .apply(LoggerMiddleware)
  .exclude(
    { path: 'cats', method: RequestMethod.GET },
    { path: 'cats', method: RequestMethod.POST },
    'cats/{*splat}',
  )
  .forRoutes(CatsController);
```

В этом примере `LoggerMiddleware` привязывается ко всем маршрутам из `CatsController`, **кроме** тех, что соответствуют трём переданным в `exclude()` записям.

:::tip[Подсказка]
Метод `exclude()` поддерживает параметры-подстановки с помощью пакета [path-to-regexp](https://github.com/pillarjs/path-to-regexp#parameters).
:::

## Функциональные middleware {/* #functional-middleware */}

Класс `LoggerMiddleware`, который мы использовали, минимален: у него нет полей, дополнительных методов и зависимостей. Такую middleware можно определить не классом, а обычной функцией. Такой вид middleware называется **функциональной middleware**. Чтобы показать разницу, превратим middleware логгера из класса в функцию:

```ts title="logger.middleware.ts"
import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  console.log('Request...');
  next();
}
```

И используем её в `AppModule`:

```ts title="app.module.ts"
consumer
  .apply(logger)
  .forRoutes(CatsController);
```

:::tip[Подсказка]
Используйте **функциональные middleware**, когда вашей middleware не нужны зависимости.
:::

## Несколько middleware {/* #multiple-middleware */}

Чтобы привязать несколько middleware, выполняющихся последовательно, передайте их списком через запятую в метод `apply()`:

```ts
consumer.apply(cors(), helmet(), logger).forRoutes(CatsController);
```

## Глобальные middleware {/* #global-middleware */}

Чтобы привязать middleware сразу ко всем зарегистрированным маршрутам, используйте метод `use()` экземпляра `INestApplication`:

```ts title="main.ts"
const app = await NestFactory.create(AppModule);
app.use(logger);
await app.listen(process.env.PORT ?? 3000);
```

:::tip[Подсказка]
У глобальных middleware, зарегистрированных через `app.use()`, нет доступа к DI-контейнеру, поэтому используйте в этом случае [функциональные middleware](#functional-middleware). Другой вариант — использовать middleware-класс и привязать его через `.forRoutes('*')` в `AppModule` (или любом другом модуле).
:::

## Обработка ошибок {/* #error-handling */}

Если middleware выбрасывает исключение, [слой исключений](./exception-filters.md) Nest перехватывает его и отправляет соответствующий ответ — так же, как для исключений, выброшенных из обработчика маршрута. Рекомендуемый подход — выбрасывать `HttpException` (или встроенный подкласс, например `UnauthorizedException`):

```ts title="auth.middleware.ts"
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.headers.authorization) {
      throw new UnauthorizedException();
    }
    next();
  }
}
```

Если middleware асинхронная, объявите `use()` как `async` (или возвращайте `Promise`), чтобы отклонённый промис передавался в слой исключений:

```ts title="auth.middleware.ts"
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = await this.authService.verify(req.headers.authorization);
    if (!user) {
      throw new UnauthorizedException();
    }
    req['user'] = user;
    next();
  }
}
```

Ошибку также можно передать в `next()`. Это полезно, когда вы оборачиваете существующую middleware в стиле Express, которая сообщает об ошибках через колбэк:

```ts
use(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return next(new UnauthorizedException());
  }
  next();
}
```

:::warning[Внимание]
Поскольку middleware выполняется до того, как выбран обработчик маршрута, исключения из middleware перехватывают только **глобальные** фильтры исключений (зарегистрированные через `app.useGlobalFilters()` или токен `APP_FILTER`). Фильтры уровня метода и контроллера не вызываются, а привязка фильтров к классу middleware через `@UseFilters()` не поддерживается.
:::

:::tip[Подсказка]
Middleware, зарегистрированные через `app.use()`, обрабатывает нижележащая HTTP-платформа (Express или Fastify), а не `MiddlewareModule` Nest. В middleware, привязанных через `MiddlewareConsumer`, лучше выбрасывать ошибки (или вызывать `next(err)`), чтобы их мог обработать слой исключений.
:::
