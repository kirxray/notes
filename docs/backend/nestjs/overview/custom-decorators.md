---
title: Пользовательские декораторы
sidebar_position: 10
---

# Пользовательские декораторы маршрутов

:::info[Оригинал]
[docs.nestjs.com — Custom decorators](https://docs.nestjs.com/custom-decorators) · NestJS 12.1 · перевод от 04.10.2026
:::

Nest построен вокруг возможности языка, которая называется **декораторами**. Декораторы давно известны во многих языках программирования, но для JavaScript всё ещё относительно новы. Чтобы глубже разобраться в том, как работают декораторы, прочитайте [эту статью](https://medium.com/google-developers/exploring-es7-decorators-76ecb65fb841) (на английском). Вот простое определение:

> Декоратор ES2016 — это выражение, которое возвращает функцию и может принимать в качестве аргументов цель, имя и дескриптор свойства. Чтобы применить декоратор, перед ним ставят символ `@` и размещают его в самом начале того, что нужно задекорировать. Декораторы можно определять для класса, метода или свойства.

## Декораторы параметров {/* #param-decorators */}

Nest предоставляет набор **декораторов параметров**, которые можно использовать в обработчиках HTTP-маршрутов. В таблице ниже они перечислены вместе с соответствующими объектами Express (или Fastify):

| Декоратор | Объект |
| --- | --- |
| `@Request(), @Req()` | `req` |
| `@Response(), @Res()` | `res` |
| `@Next()` | `next` |
| `@Session()` | `req.session` |
| `@Param(param?: string)` | `req.params` / `req.params[param]` |
| `@Body(param?: string)` | `req.body` / `req.body[param]` |
| `@Query(param?: string)` | `req.query` / `req.query[param]` |
| `@Headers(param?: string)` | `req.headers` / `req.headers[param]` |
| `@Ip()` | `req.ip` |
| `@HostParam(param?: string)` | `req.hosts` / `req.hosts[param]` |

Можно также создавать собственные **пользовательские декораторы**. Чтобы понять, чем это полезно, рассмотрим распространённый в Node.js-приложениях паттерн: свойства прикрепляются к объекту **запроса**, а затем вручную извлекаются в каждом обработчике маршрута примерно таким кодом:

```ts
const user = req.user;
```

Чтобы код стал читаемее и прозрачнее, можно создать декоратор `@User()` и переиспользовать его во всех контроллерах:

```ts title="user.decorator.ts"
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

Затем его можно использовать везде, где нужно:

```ts
@Get()
async findOne(@User() user: UserEntity) {
  console.log(user);
}
```

## Передача данных {/* #passing-data */}

Когда поведение декоратора зависит от какого-то условия, используйте параметр `data`, чтобы передать аргумент фабричной функции декоратора. Один из сценариев — пользовательский декоратор, который извлекает свойство из объекта запроса по ключу. Предположим, например, что ваш слой аутентификации{/* TODO-LINK: https://docs.nestjs.com/security/authentication#read-the-current-user — Security → Authentication → Read the current user */} проверяет запросы и прикрепляет к объекту запроса сущность пользователя. Для аутентифицированного запроса сущность пользователя может выглядеть так:

```json
{
  "id": 101,
  "firstName": "Alan",
  "lastName": "Turing",
  "email": "alan@email.com",
  "roles": ["admin"]
}
```

Определим декоратор, который принимает имя свойства в качестве ключа и возвращает соответствующее значение, если оно существует (или `undefined`, если его нет или если объект `user` не создан):

```ts title="user.decorator.ts"
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

Теперь в контроллере можно получить конкретное свойство через декоратор `@User()`:

```ts
@Get()
async findOne(@User('firstName') firstName: string) {
  console.log(`Hello ${firstName}`);
}
```

Один и тот же декоратор можно использовать с разными ключами, чтобы получать разные свойства. Если объект `user` глубокий или сложный, так реализация обработчиков маршрутов становится проще и читаемее.

:::tip[Подсказка]
`createParamDecorator<T>()` — обобщённая функция, поэтому типобезопасность можно задать явно, например `createParamDecorator<string>((data, ctx) => ...)`. Либо укажите тип параметра в фабричной функции, например `createParamDecorator((data: string, ctx) => ...)`. Если не сделать ни того ни другого, `data` получит тип `any`.
:::

## Работа с пайпами {/* #working-with-pipes */}

Nest обрабатывает пользовательские декораторы параметров так же, как встроенные (`@Body()`, `@Param()` и `@Query()`). Это значит, что пайпы выполняются и для параметров, помеченных пользовательскими декораторами (в наших примерах — для аргумента `user`). Пайп можно также применить прямо к пользовательскому декоратору:

```ts
@Get()
async findOne(
  @User(new ValidationPipe({ validateCustomDecorators: true }))
  user: UserEntity,
) {
  console.log(user);
}
```

:::tip[Подсказка]
По умолчанию `ValidationPipe` не валидирует аргументы, помеченные пользовательскими декораторами. Поэтому в примере выше опция `validateCustomDecorators` установлена в `true`.
:::

Пользовательские декораторы также принимают опцию `schema`, как и встроенные декораторы параметров. Передайте схему, совместимую со [Standard Schema](https://standardschema.dev/) (на английском), например схему Zod, — и `StandardSchemaValidationPipe` с включённой опцией `validateCustomDecorators` проверит по ней значение декоратора:

```ts
@Get()
async findOne(@User('email', { schema: z.email() }) email: string) {
  console.log(email);
}
```

Подробнее — в разделе «Валидация пользовательских декораторов»{/* TODO-LINK: https://docs.nestjs.com/application/validation#validating-custom-decorators — Application → Validation → Validating custom decorators */}.

## Композиция декораторов {/* #decorator-composition */}

Nest предоставляет вспомогательную функцию `applyDecorators()` для объединения нескольких декораторов. Например, вы хотите объединить все декораторы, связанные с аутентификацией, в один:

```ts title="auth.decorator.ts"
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(AuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
```

Затем пользовательский декоратор `@Auth()` можно использовать так:

```ts
@Get('users')
@Auth('admin')
findAllUsers() {}
```

Так все четыре декоратора применяются одним объявлением.

:::warning[Внимание]
Декоратор `@ApiHideProperty()` из пакета `@nestjs/swagger` не поддерживает композицию и некорректно работает с функцией `applyDecorators()`.
:::
