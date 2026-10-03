---
title: Пайпы
sidebar_position: 7
---

# Пайпы

:::info[Оригинал]
[docs.nestjs.com — Pipes](https://docs.nestjs.com/pipes) · NestJS 12.1 · перевод от 04.10.2026
:::

Пайп (pipe) — это класс с декоратором `@Injectable()`, реализующий интерфейс `PipeTransform`.

![Пайпы](/img/nestjs/pipe-1.png#themed)

У пайпов два типичных сценария использования:

- **преобразование**: привести входные данные к нужному виду (например, строку к целому числу);
- **валидация**: проверить входные данные и, если они корректны, пропустить их без изменений, а иначе выбросить исключение.

В обоих случаях пайпы работают с аргументами, которые обрабатывает [обработчик маршрута контроллера](./controllers.md#route-parameters). Nest вызывает пайп непосредственно перед вызовом метода: пайп получает аргументы, предназначенные для метода, и работает с ними. Всё преобразование или валидация происходит в этот момент, после чего обработчик маршрута вызывается с (возможно) преобразованными аргументами.

В Nest есть набор встроенных пайпов, которые можно использовать сразу, а также можно создавать свои. В этой главе мы познакомимся со встроенными пайпами и покажем, как привязывать их к обработчикам маршрутов. Затем разберём несколько пользовательских пайпов, чтобы показать, как написать пайп с нуля.

:::tip[Подсказка]
Пайпы выполняются внутри зоны исключений. Исключение, выброшенное пайпом, обрабатывается слоем исключений (глобальным фильтром исключений и всеми [фильтрами исключений](./exception-filters.md), применёнными к текущему контексту). Если пайп выбрасывает исключение, обработчик маршрута не выполняется. Поэтому пайпы — рекомендуемое место для валидации данных, поступающих в приложение из внешних источников, на границе системы.
:::

## Встроенные пайпы {/* #built-in-pipes */}

Nest из коробки предоставляет следующие пайпы, все они экспортируются из пакета `@nestjs/common`:

- `ValidationPipe`
- `StandardSchemaValidationPipe`
- `ParseIntPipe`
- `ParseFloatPipe`
- `ParseBoolPipe`
- `ParseArrayPipe`
- `ParseUUIDPipe`
- `ParseEnumPipe`
- `DefaultValuePipe`
- `ParseFilePipe`
- `ParseDatePipe`

Начнём с `ParseIntPipe`. Это пример сценария **преобразования**: пайп гарантирует, что параметр обработчика маршрута будет приведён к целому числу JavaScript, или выбрасывает исключение, если преобразование не удалось. Позже в этой главе мы напишем простую собственную реализацию `ParseIntPipe`. Приёмы, описанные ниже, применимы и к остальным встроенным пайпам преобразования (`ParseBoolPipe`, `ParseFloatPipe`, `ParseEnumPipe`, `ParseArrayPipe`, `ParseDatePipe` и `ParseUUIDPipe`), которые в этой главе мы будем вместе называть пайпами `Parse*`.

## Привязка пайпов {/* #binding-pipes */}

Чтобы использовать пайп, нужно привязать экземпляр класса пайпа к подходящему контексту. В примере с `ParseIntPipe` мы хотим связать пайп с конкретным методом-обработчиком маршрута и гарантировать, что он выполнится до вызова метода. Это делает следующая конструкция — будем называть её привязкой пайпа на уровне параметра метода:

```ts
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {
  return this.catsService.findOne(id);
}
```

Так гарантируется один из двух исходов: либо параметр, полученный `findOne()`, — число (как и ожидает `this.catsService.findOne()`), либо исключение выбрасывается ещё до вызова обработчика маршрута.

Например, пусть маршрут вызван так:

```bash
GET localhost:3000/abc
```

Nest выбросит исключение, которое сформирует такой ответ:

```json
{
  "statusCode": 400,
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request"
}
```

Исключение не даёт выполниться телу метода `findOne()`.

В примере выше мы передаём класс (`ParseIntPipe`), а не экземпляр. Так создание экземпляра остаётся за фреймворком и становится возможным внедрение зависимостей. Как и в случае с guard'ами и фильтрами исключений, вместо класса можно передать готовый экземпляр — это удобно, когда нужно настроить поведение встроенного пайпа с помощью параметров:

```ts
@Get(':id')
async findOne(
  @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }))
  id: number,
) {
  return this.catsService.findOne(id);
}
```

Остальные пайпы преобразования (все пайпы **Parse\***) привязываются так же. Они работают с параметрами маршрута, параметрами строки запроса и значениями тела запроса.

Например, с параметром строки запроса:

```ts
@Get()
async findOne(@Query('id', ParseIntPipe) id: number) {
  return this.catsService.findOne(id);
}
```

В следующем примере `ParseUUIDPipe` проверяет, что строковый параметр — это UUID:

```ts
@Get(':uuid')
async findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
  return this.catsService.findOne(uuid);
}
```

:::tip[Подсказка]
По умолчанию `ParseUUIDPipe` принимает UUID любой версии (версии с 1 по 8, а также Nil и Max UUID). Чтобы требовать конкретную версию, передайте параметр `version` (`'1'`, `'2'`, `'3'`, `'4'`, `'5'`, `'6'`, `'7'` или `'8'`).
:::

Привязка пайпов валидации устроена немного иначе — о ней поговорим позже в этой главе.

:::tip[Подсказка]
Множество примеров пайпов валидации — в главе «Валидация»{/* TODO-LINK: https://docs.nestjs.com/application/validation — Application → Validation */}.
:::

## Пользовательские пайпы {/* #custom-pipes */}

Как уже говорилось, можно создавать собственные пайпы. Хотя в Nest есть надёжные встроенные `ParseIntPipe` и `ValidationPipe`, давайте напишем простые версии каждого с нуля, чтобы увидеть, как устроены пользовательские пайпы.

Начнём с простого `ValidationPipe`. Сначала он принимает входное значение и возвращает его без изменений, ведя себя как тождественная функция.

```ts title="validation.pipe.ts"
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}
```

:::tip[Подсказка]
`PipeTransform<T, R>` — обобщённый интерфейс, который должен реализовывать каждый пайп. `T` обозначает тип входного значения `value`, а `R` — тип значения, возвращаемого методом `transform()`.
:::

Чтобы выполнить контракт интерфейса `PipeTransform`, каждый пайп должен реализовать метод `transform()`. У этого метода два параметра:

- `value`
- `metadata`

Параметр `value` — обрабатываемый в данный момент аргумент метода (до того, как его получит обработчик маршрута), а `metadata` — метаданные этого аргумента. Объект метаданных имеет следующие свойства:

```ts
export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: Type<unknown>;
  data?: string;
  schema?: StandardSchemaV1;
}
```

Эти свойства описывают обрабатываемый аргумент:

| Свойство | Описание |
| --- | --- |
| `type` | Указывает, чем является аргумент: телом запроса (`@Body()`), query-параметром (`@Query()`), параметром маршрута (`@Param()`) или пользовательским параметром (см. «Пользовательские декораторы»{/* TODO-LINK: https://docs.nestjs.com/custom-decorators — Overview → Custom decorators */}). |
| `metatype` | Метатип аргумента, например `String`. Значение равно `undefined`, если в сигнатуре обработчика маршрута не указан тип или используется чистый JavaScript. |
| `data` | Строка, переданная в декоратор, например `@Body('string')`. Равно `undefined`, если строка в декоратор не передана, как в `@Body()`. |
| `schema` | Схема, совместимая со Standard Schema, подключённая через параметры декоратора параметра, например `@Body({ schema })` или `@Param('id', { schema })`. Равно `undefined`, если схема не подключена. |

:::warning[Внимание]
Интерфейсы TypeScript исчезают при транспиляции. Если тип параметра метода объявлен как интерфейс, а не класс, значением `metatype` будет `Object`.
:::

:::tip[Подсказка]
Встроенный `StandardSchemaValidationPipe` использует поле `schema`, чтобы валидировать аргументы с помощью любой библиотеки, совместимой со Standard Schema. Аргументы без схемы проходят без изменений.
:::

## Валидация на основе схем {/* #schema-based-validation */}

:::tip[Подсказка]
В следующих разделах пайпы валидации пишутся с нуля, чтобы показать, как работают пайпы. Для валидации на основе схем в продакшене используйте встроенный `StandardSchemaValidationPipe`. Он работает с Zod, Valibot, ArkType и любой другой библиотекой, совместимой со [Standard Schema](https://standardschema.dev/) (на английском), и читает схему, которую вы подключаете через параметр `schema` декораторов параметров, таких как `@Body()` и `@Param()`. Подробнее — в разделе «Валидация на основе схем»{/* TODO-LINK: https://docs.nestjs.com/application/validation#schema-based-validation — Application → Validation → Schema-based validation */}.
:::

Сделаем наш пайп валидации полезнее. Рассмотрим метод `create()` контроллера `CatsController`: мы хотим убедиться, что объект тела POST-запроса корректен, прежде чем вызывать метод сервиса.

```ts
@Post()
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

Параметр тела `createCatDto` имеет тип `CreateCatDto`:

```ts title="create-cat.dto.ts"
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

Каждый запрос к методу `create()` должен содержать корректное тело, поэтому нужно провалидировать три поля объекта `createCatDto`. Это можно сделать внутри обработчика маршрута, но так мы нарушим **принцип единственной ответственности** (single responsibility principle, SRP).

Другой подход — создать **класс-валидатор** и делегировать проверку ему. Недостаток в том, что придётся не забывать вызывать валидатор в начале каждого метода.

А как насчёт middleware для валидации? Это может сработать, но невозможно написать **универсальный middleware**, который подойдёт для любого контекста во всём приложении. Middleware ничего не знает о **контексте выполнения**, в том числе о том, какой обработчик будет вызван и с какими параметрами.

Пайпы созданы как раз для такого сценария, поэтому доработаем наш пайп валидации.

## Валидация объектов по схеме {/* #object-schema-validation */}

Есть несколько способов валидировать объекты чисто и без дублирования, по принципу [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) (на английском). Один из распространённых подходов — валидация **на основе схем**, его мы здесь и используем.

Библиотека [Zod](https://zod.dev/) (на английском) позволяет описывать схемы с помощью понятного API. Напишем пайп валидации, который использует схемы Zod.

Для начала установите нужный пакет:

```bash
$ npm install --save zod
```

Класс ниже принимает схему как аргумент конструктора и вызывает `schema.parse()`, который проверяет входящий аргумент на соответствие схеме.

Как отмечалось выше, **пайп валидации** либо возвращает значение, либо выбрасывает исключение. Этот пайп возвращает значение, разобранное схемой, или выбрасывает `BadRequestException`, если валидация не прошла.

В следующем разделе показано, как передать подходящую схему для конкретного обработчика маршрута с помощью декоратора `@UsePipes()`. Так пайп валидации можно переиспользовать в разных контекстах — чего мы и добивались.

```ts
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      throw new BadRequestException('Validation failed');
    }
  }
}
```

## Привязка пайпов валидации {/* #binding-validation-pipes */}

Ранее мы видели, как привязывать пайпы преобразования (например, `ParseIntPipe` и остальные пайпы `Parse*`). Пайпы валидации привязываются так же просто.

В этом случае мы хотим привязать пайп на уровне метода. Чтобы использовать `ZodValidationPipe` в нашем примере, нужно:

1. Создать экземпляр `ZodValidationPipe`.
2. Передать в конструктор пайпа схему Zod для этого контекста.
3. Привязать пайп к методу.

Пример схемы Zod:

```ts
import { z } from 'zod';

export const createCatSchema = z.object({
  name: z.string(),
  age: z.number(),
  breed: z.string(),
});

export type CreateCatDto = z.infer<typeof createCatSchema>;
```

Привязываем пайп с помощью декоратора `@UsePipes()`:

```ts title="cats.controller.ts"
@Post()
@UsePipes(new ZodValidationPipe(createCatSchema))
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

:::tip[Подсказка]
Декоратор `@UsePipes()` импортируется из пакета `@nestjs/common`.
:::

`ZodValidationPipe` можно также привязать к конкретному параметру — вместе со встроенными пайпами. В следующем примере параметр маршрута `id` проверяется с помощью `ParseIntPipe`, а тело запроса — с помощью `ZodValidationPipe`:

```ts
@Put('/:id')
async update(
  @Param('id', ParseIntPipe) id: number,
  @Body(new ZodValidationPipe(createCatSchema)) body: CreateCatDto
): Promise<void> {
  this.catsService.update(id, body);
}
```

:::warning[Внимание]
Библиотека `zod` требует, чтобы в файле `tsconfig.json` была включена опция компилятора `strictNullChecks`.
:::

## class-validator {/* #class-validator */}

:::warning[Внимание]
Приёмы из этого раздела требуют TypeScript и недоступны, если приложение написано на чистом JavaScript.
:::

В этом разделе показана альтернативная реализация нашего подхода к валидации.

Nest хорошо работает с библиотекой [class-validator](https://github.com/typestack/class-validator) (на английском), которая предоставляет валидацию на основе декораторов. Такая валидация хорошо сочетается с возможностями **пайпов** Nest, потому что пайп имеет доступ к `metatype` обрабатываемого аргумента. Перед началом установите нужные пакеты:

```bash
$ npm i --save class-validator class-transformer
```

После установки добавьте несколько декораторов в класс `CreateCatDto`. Здесь видно существенное преимущество этого подхода: класс `CreateCatDto` остаётся единственным источником истины для объекта тела POST-запроса, и отдельный класс для валидации не нужен.

```ts title="create-cat.dto.ts"
import { IsString, IsInt } from 'class-validator';

export class CreateCatDto {
  @IsString()
  name: string;

  @IsInt()
  age: number;

  @IsString()
  breed: string;
}
```

:::tip[Подсказка]
Подробнее о декораторах class-validator — в [документации class-validator](https://github.com/typestack/class-validator#usage) (на английском).
:::

Теперь можно создать класс `ValidationPipe`, который использует эти декораторы.

```ts title="validation.pipe.ts"
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

:::tip[Подсказка]
Этот пайп намеренно сделан простым. Писать универсальный пайп валидации самостоятельно не нужно: в Nest есть более функциональный встроенный `ValidationPipe`, о котором рассказано в конце этого раздела.
:::

:::warning[Внимание]
В коде выше используется библиотека [class-transformer](https://github.com/typestack/class-transformer) (на английском) от того же автора, что и **class-validator**, поэтому они хорошо работают вместе.
:::

Разберём этот код. Во-первых, метод `transform()` помечен как `async`. Это возможно, потому что Nest поддерживает как синхронные, так и **асинхронные** пайпы. Мы делаем метод `async`, потому что некоторые проверки class-validator [могут быть асинхронными](https://github.com/typestack/class-validator#custom-validation-classes) (на английском) — они возвращают промисы.

Далее с помощью деструктуризации мы извлекаем поле `metatype` из объекта `ArgumentMetadata`. Это сокращённая запись: вместо того чтобы получить весь `ArgumentMetadata`, а затем отдельной инструкцией присвоить переменную `metatype`.

Вспомогательный метод `toValidate()` пропускает валидацию, если обрабатываемый аргумент имеет нативный тип JavaScript. К нативным типам нельзя прикрепить декораторы валидации, поэтому проверять их незачем.

Затем функция `plainToInstance()` из class-transformer превращает простой JavaScript-объект аргумента в типизированный объект, к которому можно применить валидацию. Это необходимо, потому что тело POST-запроса после десериализации из сетевого запроса **не содержит никакой информации о типе** (так работает нижележащая платформа, например Express). Class-validator опирается на декораторы валидации, которые мы ранее определили в DTO, поэтому мы превращаем входящее тело в экземпляр декорированного класса, а не валидируем простой объект.

Наконец, поскольку это **пайп валидации**, он либо возвращает значение без изменений, либо выбрасывает исключение.

Последний шаг — привязать `ValidationPipe`. Пайпы могут иметь область действия на уровне параметра, метода, контроллера или всего приложения (глобально). Ранее мы привязали пайп валидации на основе Zod на уровне метода с помощью `@UsePipes()`. В примере ниже мы привязываем экземпляр пайпа к декоратору `@Body()` обработчика маршрута, чтобы пайп валидировал тело POST-запроса.

```ts title="cats.controller.ts"
@Post()
async create(
  @Body(new ValidationPipe()) createCatDto: CreateCatDto,
) {
  this.catsService.create(createCatDto);
}
```

Пайпы на уровне параметра полезны, когда логика валидации касается только одного параметра.

## Глобальные пайпы {/* #global-scoped-pipes */}

Поскольку `ValidationPipe` спроектирован максимально универсальным, полнее всего он раскрывается как **глобальный** пайп, применяемый ко всем обработчикам маршрутов во всём приложении.

```ts title="main.ts"
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

:::warning[Внимание]
В гибридном приложении `useGlobalPipes()` по умолчанию не настраивает пайпы для подключённых микросервисов (как изменить это поведение — см. «Гибридное приложение»{/* TODO-LINK: https://docs.nestjs.com/faq/hybrid-application — FAQ → Hybrid application */}). В обычном (не гибридном) микросервисном приложении `useGlobalPipes()` подключает пайпы глобально.
:::

Глобальные пайпы, зарегистрированные вне какого-либо модуля (через `useGlobalPipes()`, как в примере выше), не могут внедрять зависимости, поскольку привязка происходит вне контекста модуля. Чтобы решить эту проблему, глобальный пайп можно зарегистрировать **непосредственно из любого модуля** с помощью такой конструкции:

```ts title="app.module.ts"
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

:::tip[Подсказка]
Когда этот подход используется для внедрения зависимостей в пайп, пайп становится глобальным независимо от того, в каком модуле он зарегистрирован. Регистрируйте его в том модуле, где определён сам пайп (в примере выше — `ValidationPipe`). Кроме того, `useClass` — не единственный способ зарегистрировать пользовательский провайдер. Подробнее — в главе «Пользовательские провайдеры»{/* TODO-LINK: https://docs.nestjs.com/fundamentals/custom-providers — Fundamentals → Custom providers */}.
:::

## Встроенный ValidationPipe {/* #the-built-in-validationpipe */}

Писать универсальный пайп валидации самостоятельно не нужно: Nest предоставляет `ValidationPipe` из коробки. У встроенного `ValidationPipe` больше параметров, чем у примера из этой главы, который намеренно сделан простым, чтобы показать механику пользовательского пайпа. Для валидации на основе схем в Nest есть также встроенный `StandardSchemaValidationPipe`. Подробности и множество примеров — в главе «Валидация»{/* TODO-LINK: https://docs.nestjs.com/application/validation — Application → Validation */}.

## Сценарий преобразования {/* #transformation-use-case */}

Валидация — не единственный сценарий использования пользовательских пайпов. Как говорилось в начале главы, пайп может также **преобразовывать** входные данные в нужный формат. Это возможно, потому что значение, возвращённое методом `transform()`, заменяет прежнее значение аргумента.

Когда это полезно? Иногда данные, пришедшие от клиента, нужно изменить (например, превратить строку в целое число), прежде чем их сможет обработать обработчик маршрута. Кроме того, некоторые обязательные поля могут отсутствовать, и для них нужно подставить значения по умолчанию. **Пайпы преобразования** выполняют эти функции, встраивая функцию обработки между запросом клиента и обработчиком маршрута.

Вот простой `ParseIntPipe`, который разбирает строку в целое число. (Как отмечалось выше, в Nest есть более продвинутый встроенный `ParseIntPipe`; это лишь простой пример пользовательского пайпа преобразования.)

```ts title="parse-int.pipe.ts"
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}
```

Затем этот пайп можно привязать к нужному параметру:

```ts
@Get(':id')
async findOne(@Param('id', new ParseIntPipe()) id) {
  return this.catsService.findOne(id);
}
```

Ещё одно полезное преобразование — найти в базе данных **существующего пользователя** по ID из запроса:

```ts
@Get(':id')
findOne(@Param('id', UserByIdPipe) userEntity: UserEntity) {
  return userEntity;
}
```

Реализацию этого пайпа оставляем читателю. Как и любой другой пайп преобразования, он получает входное значение (`id`) и возвращает выходное (объект `UserEntity`). Так код становится более декларативным и соответствует принципу [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) (на английском): шаблонный код переезжает из обработчика маршрута в переиспользуемый пайп.

## Значения по умолчанию {/* #providing-defaults */}

По умолчанию пайпы `Parse*` ожидают, что значение параметра определено, и выбрасывают исключение, получив `null` или `undefined` (если только их параметр `optional` не установлен в `true`). Чтобы эндпоинт мог обрабатывать отсутствующие параметры строки запроса, задайте значение по умолчанию, которое применяется до того, как с ним начнут работать пайпы `Parse*`. Для этого служит `DefaultValuePipe`. Создайте экземпляр `DefaultValuePipe` в декораторе `@Query()` перед соответствующим пайпом `Parse*`, как показано ниже:

```ts
@Get()
async findAll(
  @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe) activeOnly: boolean,
  @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
) {
  return this.catsService.findAll({ activeOnly, page });
}
```
