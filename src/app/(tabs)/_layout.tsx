import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Header } from '@/components/Header';
import { colors } from '@/constants/colors';
import { noNavbarScreens } from '@/constants/noNavbarScreens';

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={({ route }) => {
        const isScreensGroupRoute = route.name.startsWith('(screens)/');
        return {
          headerShown: true,
          header: () => <Header />,
          tabBarActiveTintColor: colors.logo,
          tabBarInactiveTintColor: colors.placeholder,
          // Every screen under (screens)/ is reachable-but-not-listed: no tab button, current or future.
          tabBarButton: isScreensGroupRoute ? () => null : undefined,
          tabBarItemStyle: isScreensGroupRoute ? { display: 'none' } : undefined,
          tabBarStyle: noNavbarScreens.some((screen) => route.name === `(screens)/${screen}/index`)
            ? { display: 'none' }
            : { backgroundColor: colors.background },
        };
      }}
    >
      <Tabs.Screen
        name="Feed/index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dynamic-feed" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Live/index"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="sensors" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="CreateEvent/index"
        options={{
          title: 'Create Event',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Search/index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
