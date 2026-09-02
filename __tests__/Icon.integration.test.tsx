import { render, screen } from '@testing-library/react-native';

import { Icon } from '@/components/Icon';

describe('Icon', () => {
  it('esconde ícones decorativos da árvore de acessibilidade', async () => {
    const { toJSON } = await render(<Icon name="bell" />);

    expect(toJSON()).not.toBeNull();
    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
  });

  it('expõe ícones informativos com nome acessível', async () => {
    await render(
      <Icon
        name="star"
        accessibilityLabel="Evento favorito"
        size={32}
        color="#123456"
        fill="#654321"
        strokeWidth={3}
        absoluteStrokeWidth
      />,
    );

    const icon = screen.getByLabelText('Evento favorito');
    expect(icon).toBeOnTheScreen();
    expect(icon).toHaveProp('accessibilityRole', 'image');
  });
});
