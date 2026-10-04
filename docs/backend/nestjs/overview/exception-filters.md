---
title: Фильтры исключений
sidebar_position: 6
---

# Фильтры исключений

:::info[Оригинал]
[docs.nestjs.com — Exception filters](https://docs.nestjs.com/exception-filters) · NestJS 12.1 · перевод от 04.10.2026
:::

В Nest есть встроенный **слой исключений**, который обрабатывает все необработанные исключения в приложении. Если код приложения не обработал исключение, этот слой перехватывает его и автоматически отправляет подходящий, понятный пользователю ответ.

![Фильтры исключений](/img/nestjs/filter-1.png#themed)

По умолчанию это делает встроенный **глобальный фильтр исключений**, который обрабатывает исключения типа `HttpException` (и его подклассов). Если исключение **не распознано** (не является ни `HttpException`, ни классом, унаследованным от `HttpException`), встроенный фильтр формирует такой JSON-ответ по умолчанию:

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

:::tip[Подсказка]
Глобальный фильтр исключений частично поддерживает библиотеку `http-errors`. Если выброшенная ошибка содержит свойства `statusCode` и `message` в том виде, в каком их формирует эта библиотека, в ответ отправляются эти значения, а не стандартный ответ `InternalServerErrorException` для нераспознанных исключений.
:::

## Выброс стандартных исключений {/* #throwing-standard-exceptions */}

Nest предоставляет встроенный класс `HttpException` из пакета `@nestjs/common`. Для типичных REST- и GraphQL-API на основе HTTP хорошей практикой считается отправлять стандартные объекты HTTP-ответа при возникновении определённых ошибок.

Например, в `CatsController` есть метод `findAll()` (обработчик маршрута `GET`). Предположим, этот обработчик выбрасывает исключение. Для демонстрации зададим это жёстко:

```ts title="cats.controller.ts"
@Get()
async findAll() {
  throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
}
```

:::tip[Подсказка]
`HttpStatus` — вспомогательное перечисление, импортируемое из пакета `@nestjs/common`.
:::

Когда клиент обращается к этому эндпоинту, ответ выглядит так:

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

Конструктор `HttpException` принимает два обязательных аргумента, определяющих ответ:

- Аргумент `response` задаёт тело JSON-ответа. Это может быть `string` или `object`, как описано ниже.
- Аргумент `status` задаёт [код состояния HTTP](https://developer.mozilla.org/ru/docs/Web/HTTP/Status).

По умолчанию тело JSON-ответа содержит два свойства:

- `statusCode` — по умолчанию код состояния HTTP, переданный в аргументе `status`;
- `message` — краткое описание HTTP-ошибки на основе `status`.

Чтобы переопределить только сообщение в теле JSON-ответа, передайте строку в аргументе `response`. Чтобы переопределить всё тело JSON-ответа, передайте в `response` объект. Nest сериализует объект и вернёт его как тело JSON-ответа.

Второй аргумент конструктора, `status`, должен быть корректным кодом состояния HTTP. Лучше всего использовать перечисление `HttpStatus` из `@nestjs/common`.

Необязательный **третий** аргумент конструктора, `options`, позволяет указать [причину](https://nodejs.org/en/blog/release/v16.9.0/#error-cause) ошибки (cause). Объект `cause` не сериализуется в объект ответа, но полезен для логирования, поскольку содержит информацию о внутренней ошибке, из-за которой было выброшено `HttpException`.

Пример, в котором переопределяется всё тело ответа и указывается причина ошибки:

```ts title="cats.controller.ts"
@Get()
async findAll() {
  try {
    await this.service.findAll();
  } catch (error) {
    throw new HttpException({
      status: HttpStatus.FORBIDDEN,
      error: 'This is a custom message',
    }, HttpStatus.FORBIDDEN, {
      cause: error
    });
  }
}
```

Ответ в этом случае выглядит так:

```json
{
  "status": 403,
  "error": "This is a custom message"
}
```

## Логирование исключений {/* #exceptions-logging */}

По умолчанию фильтр исключений не логирует встроенные исключения, такие как `HttpException` (и все унаследованные от него). Эти исключения считаются частью нормальной работы приложения, поэтому в консоли не появляются. То же относится к `WsException` и `RpcException` в соответствующих контекстах.

`HttpException` наследуется от класса `IntrinsicException`, который экспортируется из пакета `@nestjs/common`. Встроенные фильтры исключений никогда не логируют экземпляры `IntrinsicException` — так они отличают исключения, являющиеся частью нормальной работы, от остальных.

Чтобы логировать такие исключения, создайте собственный фильтр исключений, как описано ниже в разделе [«Фильтры исключений»](#exception-filters).

## Отслеживание ошибок в продакшене {/* #tracking-errors-in-production */}

Фильтр исключений определяет, что увидит *клиент*. Сам по себе он не сообщит вам, что двенадцать минут назад в `OrdersService` начал выбрасываться `TypeError` — на 4% оформлений заказа и только у покупателей, в корзине которых есть товар со скидкой. И не скажет, какая строка выбросила ошибку.

Обычный подход — записать стек вызовов в лог и потом искать его там — не работает как следует: стек в лог-файле указывает на скомпилированный код (`/var/app/current/dist/orders/orders.service.js:35`), не содержит контекста исходников и не говорит, первое это появление ошибки или десятитысячное.

[NestJS Observe](https://www.observe.nestjs.com/) рассматривает необработанную ошибку как полноценный объект, а не строку в логе. Каждая ошибка, дошедшая до слоя исключений, сохраняется вместе с вызвавшим её запросом, и при этом:

- **Стек вызовов показывается вместе с исходным кодом.** Фрейм через source maps сопоставляется с `src/orders/orders.service.ts:35`, а окружающие строки показываются прямо в карточке ошибки — можно прочитать упавший код, ничего не клонируя.
- **Повторы группируются в дефекты.** Ошибки с одинаковым классом и формой стека сворачиваются в одну группу с отпечатком (fingerprint), счётчиком, временем первого и последнего появления и релизом, в котором ошибка появилась. «Новая с v2.4.1» — это факт, который читается со страницы, а не вывод, который нужно сделать самому.
- **Сбой сохраняет свой контекст.** К ошибке прикреплены трейс, к которому она относится, пользователь, столкнувшийся с ней, логи, записанные во время запроса, и спаны, выполненные до выброса, — видно, что делал запрос в момент сбоя.

Поскольку ошибка уже содержит свой код, её можно одним кликом передать ИИ-агенту для программирования: **Copy agent prompt** упаковывает ошибку, сокращённый стек с исходными строками, медленные спаны и окружающие логи в самодостаточный промпт для Claude Code, Cursor или любого другого инструмента, у которого открыт ваш репозиторий.

Это дополняет фильтры, описанные в этой главе, а не заменяет их: фильтры формируют ответ, а инструментирование фиксирует, что происходило по пути к нему. Всё, что SDK собирает о сбое, описано в главе «Error monitoring»{/* TODO-LINK: https://docs.nestjs.com/observability/error-monitoring — Observability → Error monitoring */}, настройка — в главе «Observability»{/* TODO-LINK: https://docs.nestjs.com/observability/overview — Observability → Overview */}, а как превратить повторяющуюся ошибку в отслеживаемую задачу, которая сама проверяет своё исправление, — в главе «Dashboard»{/* TODO-LINK: https://docs.nestjs.com/observability/dashboard#issues — Observability → Dashboard → Issues */}.

## Пользовательские исключения {/* #custom-exceptions */}

В большинстве случаев писать собственные исключения не нужно — достаточно встроенных HTTP-исключений Nest, описанных в следующем разделе. Если собственные исключения всё же нужны, хорошей практикой будет создать свою **иерархию исключений**, в которой пользовательские исключения наследуются от базового класса `HttpException`. Тогда Nest распознает ваши исключения и автоматически сформирует ответы об ошибках. Реализуем такое исключение:

```ts title="forbidden.exception.ts"
export class ForbiddenException extends HttpException {
  constructor() {
    super('Forbidden', HttpStatus.FORBIDDEN);
  }
}
```

Поскольку `ForbiddenException` расширяет базовый `HttpException`, оно работает со встроенным обработчиком исключений, и его можно использовать в методе `findAll()`.

```ts title="cats.controller.ts"
@Get()
async findAll() {
  throw new ForbiddenException();
}
```

## Встроенные HTTP-исключения {/* #built-in-http-exceptions */}

Nest предоставляет набор стандартных исключений, унаследованных от базового `HttpException`. Они экспортируются из пакета `@nestjs/common` и соответствуют наиболее распространённым HTTP-исключениям:

- `BadRequestException`
- `UnauthorizedException`
- `NotFoundException`
- `ForbiddenException`
- `NotAcceptableException`
- `RequestTimeoutException`
- `ConflictException`
- `GoneException`
- `HttpVersionNotSupportedException`
- `PayloadTooLargeException`
- `UnsupportedMediaTypeException`
- `UnprocessableEntityException`
- `InternalServerErrorException`
- `NotImplementedException`
- `ImATeapotException`
- `MethodNotAllowedException`
- `MisdirectedException`
- `BadGatewayException`
- `ServiceUnavailableException`
- `GatewayTimeoutException`
- `PreconditionFailedException`

Все встроенные исключения также могут принимать причину ошибки (`cause`) и описание ошибки через параметр `options`:

```ts
throw new BadRequestException('Something bad happened', {
  cause: new Error(),
  description: 'Some error description',
});
```

Ответ в этом случае выглядит так:

```json
{
  "message": "Something bad happened",
  "error": "Some error description",
  "statusCode": 400
}
```

## Машиночитаемые коды ошибок {/* #machine-readable-error-codes */}

`status` и `message` исключения достаточно хорошо описывают ошибку для человека, но клиенту неудобно на них опираться при ветвлении логики. Несколько разных сбоев — например, некорректный email и слабый пароль — могут прийти как `400 Bad Request`, и клиенту придётся разбирать строку сообщения, чтобы их различить.

Чтобы этого избежать, передайте `errorCode` через параметр `options`. Это стабильный машиночитаемый идентификатор, который сериализуется в тело ответа:

```ts
throw new BadRequestException('Password is too weak', {
  errorCode: 'WEAK_PASSWORD',
});
```

Тогда ответ содержит код вместе с обычными полями:

```json
{
  "message": "Password is too weak",
  "errorCode": "WEAK_PASSWORD",
  "statusCode": 400
}
```

`errorCode` необязателен и может сочетаться с `cause` и `description`. Он доступен и в самом `HttpException`, поэтому пользовательские исключения тоже могут его задавать:

```ts
throw new HttpException(
  'Forbidden',
  HttpStatus.FORBIDDEN,
  { errorCode: 'ACCOUNT_SUSPENDED' },
);
```

:::tip[Подсказка]
В отличие от `cause`, который предназначен для логирования и никогда не сериализуется, `errorCode` входит в тело ответа и предназначен для клиентов.
:::

## Фильтры исключений {/* #exception-filters */}

Встроенный фильтр исключений автоматически справляется со многими случаями, но иногда нужен **полный контроль** над слоем исключений — например, чтобы добавить логирование или использовать другую JSON-схему в зависимости от динамических факторов. Именно для этого предназначены **фильтры исключений**. Они позволяют точно управлять потоком выполнения и содержимым ответа, отправляемого клиенту.

Создадим фильтр исключений, который перехватывает исключения — экземпляры класса `HttpException` — и реализует для них собственную логику ответа. Для этого нужен доступ к объектам `Request` и `Response` нижележащей платформы. Объект `Request` мы используем, чтобы получить исходный `url` и добавить его в ответ, а объект `Response` — чтобы напрямую управлять отправляемым ответом с помощью метода `response.json()`.

```ts title="http-exception.filter.ts"
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}
```

:::tip[Подсказка]
Все фильтры исключений должны реализовывать обобщённый интерфейс `ExceptionFilter<T>`. Для этого нужно определить метод `catch(exception: T, host: ArgumentsHost)` с указанной сигнатурой. `T` — тип исключения.
:::

:::warning[Внимание]
Если вы используете `@nestjs/platform-fastify`, вызывайте `response.send()` вместо `response.json()` и импортируйте соответствующие типы из `fastify`.
:::

Декоратор `@Catch(HttpException)` привязывает к фильтру исключений нужные метаданные и сообщает Nest, что этот фильтр ищет исключения типа `HttpException` и никакие другие. Декоратор `@Catch()` принимает один параметр или список через запятую, что позволяет настроить фильтр сразу на несколько типов исключений.

## ArgumentsHost {/* #arguments-host */}

Рассмотрим параметры метода `catch()`. Параметр `exception` — обрабатываемый в данный момент объект исключения. Параметр `host` — объект `ArgumentsHost`, утилита, дающая доступ к аргументам, переданным исходному обработчику, в каком бы контексте он ни был вызван. В примере выше мы используем его вспомогательные методы, чтобы получить объекты `Request` и `Response` запроса, в котором возникло исключение. `ArgumentsHost` подробно описан в главе «Контекст выполнения»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context — Fundamentals → Execution context */}.

Такой уровень абстракции нужен потому, что `ArgumentsHost` работает в любом контексте: не только в контексте HTTP-сервера, как здесь, но и в микросервисах и WebSockets. В главе о контексте выполнения показано, как через тот же объект добраться до исходных аргументов{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context#host-handler-arguments — Fundamentals → Execution context → Host handler arguments */} в **любом** контексте — это позволяет написать один фильтр исключений, работающий во всех них.

## Привязка фильтров {/* #binding-filters */}

Привяжем новый `HttpExceptionFilter` к методу `create()` контроллера `CatsController`.

```ts title="cats.controller.ts"
@Post()
@UseFilters(new HttpExceptionFilter())
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
```

:::tip[Подсказка]
Декоратор `@UseFilters()` импортируется из пакета `@nestjs/common`.
:::

Как и `@Catch()`, декоратор `@UseFilters()` принимает один экземпляр фильтра или список экземпляров через запятую. Здесь мы создали экземпляр `HttpExceptionFilter` на месте. Вместо этого можно передать класс (а не экземпляр) — тогда созданием экземпляра займётся фреймворк, и станет доступно **внедрение зависимостей**.

```ts title="cats.controller.ts"
@Post()
@UseFilters(HttpExceptionFilter)
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
```

:::tip[Подсказка]
По возможности привязывайте фильтры классом, а не экземпляром. Это снижает **расход памяти**, поскольку Nest может повторно использовать экземпляры одного класса во всём модуле.
:::

В примере выше `HttpExceptionFilter` применяется только к обработчику маршрута `create()`, то есть имеет область действия метода. Фильтры исключений можно задавать на разных уровнях: для метода (метода контроллера, резолвера или шлюза), для контроллера или глобально. Например, чтобы задать фильтр на уровне контроллера, сделайте так:

```ts title="cats.controller.ts"
@Controller()
@UseFilters(new HttpExceptionFilter())
export class CatsController {}
```

Так `HttpExceptionFilter` будет применяться ко всем обработчикам маршрутов, определённым в `CatsController`.

Чтобы создать глобальный фильтр, сделайте так:

```ts title="main.ts"
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

:::warning[Внимание]
Метод `useGlobalFilters()` не настраивает фильтры для шлюзов (gateways) и гибридных приложений.
:::

Глобальные фильтры действуют во всём приложении — для каждого контроллера и каждого обработчика маршрута. С точки зрения внедрения зависимостей глобальные фильтры, зарегистрированные вне какого-либо модуля (через `useGlobalFilters()`, как в примере выше), не могут внедрять зависимости, поскольку регистрация происходит вне контекста модуля. Чтобы решить эту проблему, глобальный фильтр можно зарегистрировать **непосредственно из любого модуля** с помощью такой конструкции:

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

:::tip[Подсказка]
Когда этот подход используется для внедрения зависимостей в фильтр, фильтр становится глобальным независимо от того, в каком модуле применена конструкция. Регистрируйте его в том модуле, где определён сам фильтр (в примере выше — `HttpExceptionFilter`). Кроме того, `useClass` — не единственный способ зарегистрировать пользовательский провайдер. Подробнее — в главе [«Пользовательские провайдеры»](../fundamentals/custom-providers.md).
:::

:::tip[Подсказка]
Исключения, выброшенные из [middleware](./middleware.md#error-handling), тоже обрабатываются слоем исключений. Поскольку middleware выполняется до выбора обработчика маршрута, применяются только **глобальные** фильтры исключений (`app.useGlobalFilters()` или `APP_FILTER`). Привязки `@UseFilters()` на уровне метода и контроллера не вызываются.
:::

С помощью этого приёма можно зарегистрировать сколько угодно фильтров, добавляя каждый в массив `providers`.

## Перехват всех исключений {/* #catch-everything */}

Чтобы перехватывать **все** необработанные исключения независимо от их типа, оставьте список параметров декоратора `@Catch()` пустым: `@Catch()`.

Пример ниже не зависит от платформы: он отправляет ответ через HTTP-адаптер{/* TODO-LINK: https://docs.nestjs.com/faq/http-adapter — FAQ → HTTP adapter */}, а не напрямую через платформенные объекты `Request` и `Response`, поэтому один и тот же фильтр работает и с Express, и с Fastify.

```ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // В некоторых ситуациях `httpAdapter` может быть недоступен
    // в конструкторе, поэтому получаем его здесь.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
```

:::warning[Внимание]
Если вы сочетаете фильтр, перехватывающий всё, с фильтром, привязанным к конкретному типу исключения, объявляйте перехватывающий всё фильтр **первым**, чтобы более специфичный фильтр мог обработать свой тип.
:::

## Наследование {/* #inheritance */}

Обычно фильтры исключений полностью пишутся под требования приложения. Но иногда бывает нужно расширить встроенный **глобальный фильтр исключений** и переопределить его поведение только при определённых условиях.

Чтобы делегировать обработку исключения базовому фильтру, расширьте `BaseExceptionFilter` и вызовите унаследованный метод `catch()`.

```ts title="all-exceptions.filter.ts"
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}
```

:::warning[Внимание]
Фильтры уровня метода и контроллера, расширяющие `BaseExceptionFilter`, не следует создавать через `new`. Пусть экземпляры создаёт фреймворк.
:::

Глобальные фильтры **могут** расширять базовый фильтр — одним из двух способов.

Первый — передать ссылку на `HttpAdapter` в конструктор при создании пользовательского глобального фильтра:

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

Второй — зарегистрировать фильтр через токен `APP_FILTER`, [как показано выше](#binding-filters).
