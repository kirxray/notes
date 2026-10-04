---
title: Guard'ы
sidebar_position: 8
---

# Guard'ы

:::info[Оригинал]
[docs.nestjs.com — Guards](https://docs.nestjs.com/guards) · NestJS 12.1 · перевод от 04.10.2026
:::

Guard («страж») — это класс с декоратором `@Injectable()`, реализующий интерфейс `CanActivate`.

![Guard'ы](/img/nestjs/guards-1.png#themed)

У guard'ов **единственная ответственность**: они решают, будет ли данный запрос обработан обработчиком маршрута, исходя из условий, известных во время выполнения (например, прав доступа, ролей или ACL). Это часто называют **авторизацией**. В традиционных Express-приложениях авторизацию (и её близкую родственницу — **аутентификацию**, с которой она обычно работает в паре) как правило выполнял [middleware](./middleware.md). Middleware хорошо подходит для аутентификации, потому что такие задачи, как проверка токена и добавление свойств в объект `request`, не привязаны к контексту конкретного маршрута (и его метаданным).

Однако middleware по своей природе «слеп» к контексту: он не знает, какой обработчик будет выполнен после вызова `next()`. **Guard'ы**, напротив, имеют доступ к экземпляру `ExecutionContext` и поэтому точно знают, что будет выполнено дальше. Как и фильтры исключений, пайпы и интерсепторы, guard'ы позволяют встроить логику обработки ровно в нужную точку цикла запрос/ответ, причём декларативно. Это помогает избежать дублирования кода (принцип DRY).

:::tip[Подсказка]
Guard'ы выполняются **после** всех middleware, но **до** любых интерсепторов и пайпов.
:::

## Guard авторизации {/* #authorization-guard */}

Как уже говорилось, **авторизация** — типичный сценарий для guard'ов: определённые маршруты должны быть доступны, только если у вызывающего (обычно конкретного аутентифицированного пользователя) достаточно прав. `AuthGuard`, который мы сейчас напишем, предполагает, что пользователь аутентифицирован и, следовательно, к заголовкам запроса прикреплён токен. Guard извлекает и проверяет токен, а затем по извлечённым данным решает, может ли запрос быть обработан.

```ts title="auth.guard.ts"
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}
```

:::tip[Подсказка]
Реальный пример механизма аутентификации — в главе «Аутентификация»{/* TODO-LINK: https://docs.nestjs.com/security/authentication — Security → Authentication */}. Более сложный пример авторизации — в главе «Авторизация»{/* TODO-LINK: https://docs.nestjs.com/security/authorization — Security → Authorization */}.
:::

Логика внутри функции `validateRequest()` может быть сколь угодно простой или сложной. Цель примера — показать, какое место guard'ы занимают в цикле запрос/ответ.

Каждый guard должен реализовать метод `canActivate()`. Он возвращает булево значение, показывающее, разрешён ли текущий запрос, — синхронно или асинхронно (через `Promise` или `Observable`). По возвращённому значению Nest решает, что делать дальше:

- если возвращено `true`, запрос обрабатывается;
- если возвращено `false`, Nest отклоняет запрос.

## Контекст выполнения {/* #execution-context */}

Метод `canActivate()` принимает единственный аргумент — экземпляр `ExecutionContext`. `ExecutionContext` наследуется от `ArgumentsHost`, который мы рассматривали в главе о фильтрах исключений. В примере выше используются те же вспомогательные методы, определённые в `ArgumentsHost`, чтобы получить ссылку на объект `Request`. Подробнее — в разделе [ArgumentsHost](./exception-filters.md#arguments-host) главы о фильтрах исключений.

Наследуясь от `ArgumentsHost`, `ExecutionContext` добавляет несколько вспомогательных методов, которые дают дополнительные сведения о текущем процессе выполнения. Эти сведения помогают писать более универсальные guard'ы, работающие с широким набором контроллеров, методов и контекстов выполнения. Подробнее об `ExecutionContext` — в главе «Контекст выполнения»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context — Fundamentals → Execution context */}.

## Аутентификация на основе ролей {/* #role-based-authentication */}

Напишем более функциональный guard, который пропускает только пользователей с определённой ролью. Начнём с простого шаблона guard'а и будем развивать его в следующих разделах. Пока он пропускает все запросы:

```ts title="roles.guard.ts"
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
```

## Привязка guard'ов {/* #binding-guards */}

Как и пайпы с фильтрами исключений, guard'ы могут действовать на уровне контроллера, метода или глобально. Ниже мы подключаем guard на уровне контроллера с помощью декоратора `@UseGuards()`. Декоратор принимает один guard или список guard'ов через запятую, так что целый набор guard'ов можно применить одним объявлением.

```ts
@Controller('cats')
@UseGuards(RolesGuard)
export class CatsController {}
```

:::tip[Подсказка]
Декоратор `@UseGuards()` импортируется из пакета `@nestjs/common`.
:::

Выше мы передали класс `RolesGuard` (а не экземпляр), оставив создание экземпляра фреймворку и сделав возможным внедрение зависимостей. Как и в случае с пайпами и фильтрами исключений, можно передать и готовый экземпляр:

```ts
@Controller('cats')
@UseGuards(new RolesGuard())
export class CatsController {}
```

Такая конструкция подключает guard ко всем обработчикам, объявленным в контроллере. Чтобы применить guard только к одному методу, используйте декоратор `@UseGuards()` на **уровне метода**.

Чтобы настроить глобальный guard, используйте метод `useGlobalGuards()` экземпляра Nest-приложения:

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalGuards(new RolesGuard());
```

:::warning[Внимание]
В гибридном приложении `useGlobalGuards()` по умолчанию не настраивает guard'ы для подключённых микросервисов (как изменить это поведение — см. «Гибридное приложение»{/* TODO-LINK: https://docs.nestjs.com/faq/hybrid-application — FAQ → Hybrid application */}). В обычном (не гибридном) микросервисном приложении `useGlobalGuards()` подключает guard'ы глобально.
:::

Глобальные guard'ы действуют во всём приложении — для каждого контроллера и каждого обработчика маршрута. Однако глобальный guard, зарегистрированный вне какого-либо модуля (через `useGlobalGuards()`, как в примере выше), не может внедрять зависимости, поскольку регистрация происходит вне контекста модуля. Чтобы решить эту проблему, зарегистрируйте guard непосредственно из любого модуля с помощью такой конструкции:

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

:::tip[Подсказка]
Когда этот подход используется для внедрения зависимостей в guard, guard становится глобальным независимо от того, в каком модуле он зарегистрирован. Рекомендуем регистрировать его в том модуле, где определён сам guard (в примере выше — `RolesGuard`). Кроме того, `useClass` — не единственный способ зарегистрировать пользовательский провайдер. Подробнее — в главе [«Пользовательские провайдеры»](../fundamentals/custom-providers.md).
:::

:::tip[Подсказка]
Токен `APP_GUARD` можно регистрировать несколько раз (в одном или разных модулях): каждый зарегистрированный guard выполняется для каждого запроса в порядке регистрации. `APP_GUARD` (как и остальные токены `APP_*`) — псевдопровайдер, который фреймворк использует при запуске: его нельзя потом получить через `app.get()` или внедрить в другом месте.
:::

## Роли для каждого обработчика {/* #setting-roles-per-handler */}

Наш `RolesGuard` работает, но пока не очень умён: он не использует самую важную возможность guard'ов — контекст выполнения{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context — Fundamentals → Execution context */}. Он ничего не знает о ролях и о том, какие роли допустимы для каждого обработчика. Например, у `CatsController` могут быть разные схемы прав для разных маршрутов: одни доступны только администраторам, другие открыты для всех. Как гибко и переиспользуемо сопоставить роли с маршрутами?

Здесь в игру вступают **пользовательские метаданные** (см. «Рефлексия и метаданные»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata — Fundamentals → Execution context → Reflection and metadata */}). Nest позволяет прикреплять к обработчикам маршрутов пользовательские **метаданные** — либо через декораторы, созданные статическим методом `Reflector.createDecorator()`, либо через встроенный декоратор `@SetMetadata()`.

Например, создадим декоратор `@Roles()` с помощью метода `Reflector.createDecorator()`, который прикрепляет метаданные к обработчику. `Reflector` предоставляется фреймворком из коробки и экспортируется из пакета `@nestjs/core`.

```ts title="roles.decorator.ts"
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<string[]>();
```

Декоратор `Roles` — это функция, принимающая единственный аргумент типа `string[]`.

Чтобы использовать декоратор, пометьте им обработчик:

```ts title="cats.controller.ts"
@Post()
@Roles(['admin'])
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

Здесь мы прикрепили метаданные декоратора `Roles` к методу `create()`, указав, что доступ к этому маршруту должен быть только у пользователей с ролью `admin`.

Вместо метода `Reflector.createDecorator()` можно использовать встроенный декоратор `@SetMetadata()`. Подробнее — в разделе «Низкоуровневый подход»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context#low-level-approach — Fundamentals → Execution context → Low-level approach */}.

## Собираем всё вместе {/* #putting-it-all-together */}

Теперь свяжем это с нашим `RolesGuard`. Сейчас он во всех случаях возвращает `true` и пропускает любой запрос. Мы хотим, чтобы возвращаемое значение зависело от сравнения **ролей текущего пользователя** с ролями, которые требует обрабатываемый маршрут. Чтобы получить роль (роли) маршрута — пользовательские метаданные, — снова используем класс `Reflector`:

```ts title="roles.guard.ts"
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return matchRoles(roles, user.roles);
  }
}
```

:::tip[Подсказка]
В приложениях на Node.js принято прикреплять авторизованного пользователя к объекту `request`. Поэтому пример выше предполагает, что `request.user` содержит экземпляр пользователя и его роли. В своём приложении вы, скорее всего, будете устанавливать эту связь в пользовательском **guard'е аутентификации** (или middleware). Подробнее — в главе «Аутентификация»{/* TODO-LINK: https://docs.nestjs.com/security/authentication — Security → Authentication */}.
:::

:::warning[Внимание]
Функцию `matchRoles()` Nest не предоставляет. Её логика может быть настолько простой или сложной, насколько требует ваше приложение; цель примера — показать, какое место guard'ы занимают в цикле запрос/ответ.
:::

Подробнее о контекстно-зависимом использовании `Reflector` — в разделе «Рефлексия и метаданные»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata — Fundamentals → Execution context → Reflection and metadata */} главы **«Контекст выполнения»**.

Когда пользователь с недостаточными правами обращается к эндпоинту, Nest автоматически возвращает такой ответ:

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

Под капотом, когда guard возвращает `false`, фреймворк выбрасывает `ForbiddenException`. Чтобы вернуть другой ответ об ошибке, выбросьте собственное исключение. Например:

```ts
throw new UnauthorizedException();
```

Любое исключение, выброшенное guard'ом, обрабатывается [слоем исключений](./exception-filters.md) (глобальным фильтром исключений и всеми фильтрами исключений, применёнными к текущему контексту).

:::tip[Подсказка]
Реальный пример реализации авторизации — в главе «Авторизация»{/* TODO-LINK: https://docs.nestjs.com/security/authorization — Security → Authorization */}.
:::
