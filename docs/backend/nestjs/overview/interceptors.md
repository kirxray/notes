---
title: Интерсепторы
sidebar_position: 9
---

# Интерсепторы

:::info[Оригинал]
[docs.nestjs.com — Interceptors](https://docs.nestjs.com/interceptors) · NestJS 12.1 · перевод от 04.10.2026
:::

Интерсептор (interceptor, «перехватчик») — это класс с декоратором `@Injectable()`, реализующий интерфейс `NestInterceptor`.

![Интерсепторы](/img/nestjs/interceptors-1.png#themed)

Интерсепторы дают набор возможностей, вдохновлённых [аспектно-ориентированным программированием](https://en.wikipedia.org/wiki/Aspect-oriented_programming) (AOP, на английском). С их помощью можно:

- выполнять дополнительную логику до или после выполнения метода;
- преобразовывать результат, возвращаемый функцией;
- преобразовывать исключение, выброшенное функцией;
- расширять базовое поведение функции;
- полностью подменять функцию в зависимости от определённых условий (например, для кеширования).

## Основы {/* #basics */}

Каждый интерсептор реализует метод `intercept()`, который принимает два аргумента. Первый — экземпляр `ExecutionContext` (ровно тот же объект, что и у [guard'ов](./guards.md)). `ExecutionContext` наследуется от `ArgumentsHost`, который мы рассматривали в главе о фильтрах исключений. Там мы видели, что это обёртка над аргументами, переданными исходному обработчику, и что она содержит разные массивы аргументов в зависимости от типа приложения. Подробнее — в главе [«Фильтры исключений»](./exception-filters.md#arguments-host).

## Контекст выполнения {/* #execution-context */}

Наследуясь от `ArgumentsHost`, `ExecutionContext` добавляет несколько вспомогательных методов, которые дают дополнительные сведения о текущем процессе выполнения. Эти сведения помогают писать более универсальные интерсепторы, работающие с широким набором контроллеров, методов и контекстов выполнения. Подробнее об `ExecutionContext` — в главе «Контекст выполнения»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context — Fundamentals → Execution context */}.

## Call handler {/* #call-handler */}

Второй аргумент — `CallHandler`. Интерфейс `CallHandler` предоставляет метод `handle()`, с помощью которого в какой-то момент внутри интерсептора вызывается метод-обработчик маршрута. Если не вызвать `handle()` в реализации метода `intercept()`, обработчик маршрута не выполнится вовсе.

Это значит, что метод `intercept()` по сути **оборачивает** поток запроса/ответа. Поэтому можно реализовать свою логику **как до, так и после** выполнения конечного обработчика маршрута. Выполнить код **до** обработчика просто: поместите его перед вызовом `handle()`. Чтобы реагировать на то, что происходит после, используйте `Observable`, который возвращает `handle()`: к нему можно применять операторы [RxJS](https://github.com/ReactiveX/rxjs) (на английском), чтобы дальше обрабатывать ответ. В терминологии аспектно-ориентированного программирования вызов обработчика маршрута (то есть вызов `handle()`) называется [Pointcut](https://en.wikipedia.org/wiki/Pointcut) (на английском) — это точка, в которую встраивается наша дополнительная логика.

Рассмотрим, например, входящий запрос `POST /cats`. Он предназначен обработчику `create()`, определённому в `CatsController`. Если по пути будет вызван интерсептор, который не вызывает `handle()`, метод `create()` не выполнится. Как только `handle()` вызван и на возвращённый им `Observable` оформлена подписка (Nest подписывается на поток, который возвращает ваш метод `intercept()`), запускается обработчик `create()`. Пока результат обработчика проходит по потоку, к нему можно применить дополнительные операции, прежде чем итоговый результат будет возвращён вызывающему.

## Перехват аспектов {/* #aspect-interception */}

Первый сценарий, который мы рассмотрим, — логирование действий пользователя с помощью интерсептора (например, сохранение вызовов пользователя, асинхронная отправка событий или вычисление временной метки). В следующем примере показан простой `LoggingInterceptor`:

```ts title="logging.interceptor.ts"
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`After... ${Date.now() - now}ms`)),
      );
  }
}
```

:::tip[Подсказка]
`NestInterceptor<T, R>` — обобщённый интерфейс, в котором `T` — тип значений, испускаемых `Observable<T>`, который возвращает `next.handle()` (поток ответа), а `R` — тип значений, испускаемых `Observable<R>`, который возвращает `intercept()`.
:::

:::warning[Внимание]
Интерсепторы, как и контроллеры, провайдеры, guard'ы и т. д., могут **внедрять зависимости** через свой `constructor`.
:::

Поскольку `handle()` возвращает RxJS `Observable`, для работы с потоком доступен широкий набор операторов. В примере выше используется оператор `tap()`, который вызывает нашу функцию логирования, когда поток испускает результат обработчика маршрута, никак иначе не вмешиваясь в цикл ответа. Обратите внимание: если обработчик маршрута выбросит исключение, эта функция не вызовется. Чтобы выполнить логику и в этом случае, передайте в `tap()` объект-наблюдатель с колбэком `error` или используйте оператор `finalize()`.

:::tip[Подсказка]
Замер времени обработчика вручную, как выше, — минимальная версия того, что делает APM. [NestJS Observe](https://www.observe.nestjs.com/) (на английском) записывает тот же замер для каждого контроллера, провайдера и потребителя очереди — без написания и привязки интерсептора. Кроме того, он записывает время, которое каждый из них потратил сам, за вычетом всего, чего он ожидал. Подробнее — в главе «Observability»{/* TODO-LINK: https://docs.nestjs.com/observability/overview — Observability → Overview */}.
:::

## Привязка интерсепторов {/* #binding-interceptors */}

Чтобы подключить интерсептор, используйте декоратор `@UseInterceptors()`. Как и [пайпы](./pipes.md) и [guard'ы](./guards.md), интерсепторы могут действовать на уровне контроллера, метода или глобально.

```ts title="cats.controller.ts"
@UseInterceptors(LoggingInterceptor)
export class CatsController {}
```

:::tip[Подсказка]
Декоратор `@UseInterceptors()` импортируется из пакета `@nestjs/common`.
:::

С такой конструкцией каждый обработчик маршрута, определённый в `CatsController`, будет использовать `LoggingInterceptor`. Когда клиент вызовет эндпоинт `GET /cats`, в стандартном выводе появится:

```text
Before...
After... 1ms
```

Обратите внимание: мы передали класс `LoggingInterceptor` (а не экземпляр), оставив создание экземпляра фреймворку и сделав возможным внедрение зависимостей. Как и в случае с пайпами, guard'ами и фильтрами исключений, можно передать и готовый экземпляр:

```ts title="cats.controller.ts"
@UseInterceptors(new LoggingInterceptor())
export class CatsController {}
```

Такая конструкция подключает интерсептор ко всем обработчикам, объявленным в контроллере. Чтобы ограничить действие интерсептора одним методом, примените декоратор на **уровне метода**.

Чтобы настроить глобальный интерсептор, используйте метод `useGlobalInterceptors()` экземпляра Nest-приложения:

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

Глобальные интерсепторы действуют во всём приложении — для каждого контроллера и каждого обработчика маршрута. Однако глобальный интерсептор, зарегистрированный вне какого-либо модуля (через `useGlobalInterceptors()`, как в примере выше), не может внедрять зависимости, поскольку регистрация происходит вне контекста модуля. Чтобы решить эту проблему, зарегистрируйте интерсептор **непосредственно из любого модуля** с помощью такой конструкции:

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

:::tip[Подсказка]
Когда этот подход используется для внедрения зависимостей в интерсептор, интерсептор становится глобальным независимо от того, в каком модуле он зарегистрирован. Рекомендуем регистрировать его в том модуле, где определён сам интерсептор (в примере выше — `LoggingInterceptor`). Кроме того, `useClass` — не единственный способ зарегистрировать пользовательский провайдер. Подробнее — в главе «Пользовательские провайдеры»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/custom-providers — Fundamentals → Custom providers */}.
:::

## Преобразование ответа {/* #response-mapping */}

Поток, возвращаемый `handle()`, содержит значение, **возвращённое** обработчиком маршрута, поэтому его можно преобразовать оператором RxJS `map()`.

:::warning[Внимание]
Преобразование ответа не работает со стратегией ответа, специфичной для библиотеки, то есть когда обработчик маршрута внедряет объект ответа через `@Res()` и сам отправляет ответ. Чтобы совместить одно с другим, включите опцию `passthrough` (см. [«Подход, специфичный для библиотеки»](./controllers.md#library-specific-approach)).
:::

Создадим `TransformInterceptor`, который тривиальным образом изменяет каждый ответ, чтобы продемонстрировать процесс. Он с помощью оператора RxJS `map()` записывает объект ответа в свойство `data` нового объекта и возвращает этот новый объект клиенту.

```ts title="transform.interceptor.ts"
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map(data => ({ data })));
  }
}
```

:::tip[Подсказка]
Метод `intercept()` может быть синхронным или асинхронным. Объявите его `async`, если перед возвратом потока нужно что-то дождаться.
:::

Если этот интерсептор привязан, запрос `GET /cats`, обработчик которого возвращает пустой массив `[]`, получит такой ответ:

```json
{
  "data": []
}
```

Интерсепторы хорошо подходят для создания переиспользуемых решений для требований, охватывающих всё приложение. Например, представьте, что нужно заменить каждое значение `null` в ответе на пустую строку `''`. Это делается одной строкой кода, а интерсептор привязывается глобально, чтобы его автоматически использовал каждый зарегистрированный обработчик.

```ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(map(value => value === null ? '' : value ));
  }
}
```

## Преобразование исключений {/* #exception-mapping */}

Ещё один сценарий — подмена выброшенных исключений с помощью оператора RxJS `catchError()`:

```ts title="errors.interceptor.ts"
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  BadGatewayException,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(
        catchError(err => throwError(() => new BadGatewayException())),
      );
  }
}
```

## Подмена потока {/* #stream-overriding */}

Иногда нужно вообще не вызывать обработчик и вернуть вместо этого другое значение. Типичный пример — кеш, ускоряющий ответ. Рассмотрим простой **интерсептор кеширования**, который возвращает ответ из кеша. Реалистичной реализации пришлось бы учитывать и TTL, и инвалидацию кеша, и его размер, но это выходит за рамки нашего обсуждения. Следующий простой пример демонстрирует основную идею.

```ts title="cache.interceptor.ts"
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isCached = true;
    if (isCached) {
      return of([]);
    }
    return next.handle();
  }
}
```

В нашем `CacheInterceptor` переменная `isCached` и ответ `[]` жёстко заданы в коде. Главное здесь то, что возвращается новый поток, созданный функцией RxJS `of()`, поэтому обработчик маршрута **вообще не вызывается**. Когда кто-то обращается к эндпоинту, использующему `CacheInterceptor`, сразу возвращается ответ (жёстко заданный пустой массив). Чтобы сделать универсальное решение, используйте `Reflector` вместе с пользовательским декоратором, как описано в главе [«Guard'ы»](./guards.md).

## Другие операторы {/* #more-operators */}

Работа с потоком через операторы RxJS открывает много возможностей. Рассмотрим ещё один распространённый сценарий — обработку **таймаутов** запросов к маршрутам. Если эндпоинт ничего не возвращает в течение заданного времени, запрос нужно завершить ответом с ошибкой. Это позволяет сделать следующая конструкция:

```ts title="timeout.interceptor.ts"
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  }
}
```

Если обработчик маршрута не выдаст результат за 5 секунд, `timeout()` завершит поток ошибкой `TimeoutError`, которую интерсептор превратит в `RequestTimeoutException`. Отписка от потока обработчика не прерывает работу, которую обработчик уже начал (например, незавершённый запрос к базе данных), поэтому, если нужно освободить ресурсы, добавьте свою логику перед выбросом `RequestTimeoutException`.
