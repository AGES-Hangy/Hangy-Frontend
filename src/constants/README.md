# Design tokens (`src/constants`)

Tokens do [Style Guide](../../) da Hangy usados em componentes e telas.

- [colors.ts](./colors.ts): `palette` (cores cruas) e `colors` (tokens semânticos de aplicação)
- [typography.ts](./typography.ts): `typography` (estilos de texto) e `fontFamily`
- [layout.ts](./layout.ts): `radius`, `spacing` e `elevation`

Todos são importados com o alias `@/*`, que resolve para `src/*`:

```ts
import { colors, palette } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { radius, spacing, elevation } from '@/constants/layout';
```

## Regra geral

Use os tokens existentes para cores, tipografia e espaçamento. Assim, mudanças
nesses valores chegam aos componentes que os usam. Quando uma medida do design
não tiver token equivalente, justifique o valor específico, conforme [AGENTS.md](../../AGENTS.md).

## Cores

Prefira `colors` (tokens de aplicação). Use `palette` (cores cruas) quando
não houver um token semântico equivalente em `colors`.

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

function Card() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Futebol na PUC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.default,
    borderWidth: 1,
  },
  title: {
    color: colors.text.primary,
  },
});
```

## Tipografia

Cada estilo de `typography` contém `fontSize`, `lineHeight`, `fontWeight` e
`letterSpacing`. Aplique o estilo com spread (`...`):

```tsx
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  meta: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});
```

`fontFamily.base` ('Inter') existe como token, mas o app ainda não carrega a fonte.
Configure o carregamento antes de aplicar `fontFamily` aos componentes; sem ele,
o texto usa a fonte de fallback do sistema.

## Raio, espaçamento e elevação

`spacing` segue a grade de 4pt (chaves numéricas: `spacing[16]`, `spacing[24]`, etc.).
`radius` cobre os raios de borda. `elevation` já vem como objeto pronto de sombra
(`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`).
Aplique-o com spread no style:

```tsx
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
import { radius, spacing, elevation } from '@/constants/layout';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing[16],
    marginBottom: spacing[12],
    backgroundColor: colors.surface.card,
    ...elevation[1],
  },
});
```

## Componentes de referência

[TopAppBar](../components/TopAppBar/index.tsx) e [BottomNav](../components/BottomNav/index.tsx)
usam `colors` e servem de referência para os imports e a estrutura dos estilos.
