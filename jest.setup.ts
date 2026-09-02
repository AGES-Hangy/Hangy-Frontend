jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = (props: Record<string, unknown>) =>
    React.createElement(View, props);

  return new Proxy(
    { __esModule: true },
    {
      get(target, property) {
        if (property in target) {
          return target[property as keyof typeof target];
        }
        return MockIcon;
      },
    },
  );
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    MaterialIcons: (props: Record<string, unknown>) =>
      React.createElement(View, props),
  };
});
