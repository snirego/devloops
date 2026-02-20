import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import type {
  BoardsStackParamList,
  ChatsStackParamList,
  MainTabParamList,
  RootStackParamList,
  SettingsStackParamList,
  WorkItemsStackParamList,
} from "./types";

import { useAuth } from "~/hooks/useAuth";

import LoginScreen from "~/screens/auth/LoginScreen";
import WorkItemsListScreen from "~/screens/workitems/WorkItemsListScreen";
import WorkItemDetailScreen from "~/screens/workitems/WorkItemDetailScreen";
import ThreadListScreen from "~/screens/chats/ThreadListScreen";
import ThreadDetailScreen from "~/screens/chats/ThreadDetailScreen";
import BoardListScreen from "~/screens/boards/BoardListScreen";
import BoardDetailScreen from "~/screens/boards/BoardDetailScreen";
import SettingsScreen from "~/screens/settings/SettingsScreen";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const WIStack = createNativeStackNavigator<WorkItemsStackParamList>();
const ChatStack = createNativeStackNavigator<ChatsStackParamList>();
const BrdStack = createNativeStackNavigator<BoardsStackParamList>();
const SetStack = createNativeStackNavigator<SettingsStackParamList>();

const darkTheme = {
  dark: true as const,
  colors: {
    primary: "#818cf8",
    background: "#0f172a",
    card: "#1e293b",
    text: "#f8fafc",
    border: "#334155",
    notification: "#f43f5e",
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" as const },
    medium: { fontFamily: "System", fontWeight: "500" as const },
    bold: { fontFamily: "System", fontWeight: "700" as const },
    heavy: { fontFamily: "System", fontWeight: "800" as const },
  },
};

function WorkItemsStack() {
  return (
    <WIStack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f8fafc" }}>
      <WIStack.Screen name="WorkItemsList" component={WorkItemsListScreen} options={{ title: "Work Items" }} />
      <WIStack.Screen name="WorkItemDetail" component={WorkItemDetailScreen} options={{ title: "Details" }} />
    </WIStack.Navigator>
  );
}

function ChatsStack() {
  return (
    <ChatStack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f8fafc" }}>
      <ChatStack.Screen name="ThreadList" component={ThreadListScreen} options={{ title: "Chats" }} />
      <ChatStack.Screen
        name="ThreadDetail"
        component={ThreadDetailScreen}
        options={({ route }) => ({ title: route.params?.title ?? "Chat" })}
      />
    </ChatStack.Navigator>
  );
}

function BoardsStack() {
  return (
    <BrdStack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f8fafc" }}>
      <BrdStack.Screen name="BoardList" component={BoardListScreen} options={{ title: "Boards" }} />
      <BrdStack.Screen
        name="BoardDetail"
        component={BoardDetailScreen}
        options={({ route }) => ({ title: route.params?.title ?? "Board" })}
      />
    </BrdStack.Navigator>
  );
}

function SettingsStack() {
  return (
    <SetStack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f8fafc" }}>
      <SetStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </SetStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#1e293b", borderTopColor: "#334155" },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#64748b",
      }}
    >
      <Tab.Screen
        name="WorkItemsTab"
        component={WorkItemsStack}
        options={{ tabBarLabel: "Work Items", tabBarIcon: ({ color }) => tabIcon("W", color) }}
      />
      <Tab.Screen
        name="ChatsTab"
        component={ChatsStack}
        options={{ tabBarLabel: "Chats", tabBarIcon: ({ color }) => tabIcon("C", color) }}
      />
      <Tab.Screen
        name="BoardsTab"
        component={BoardsStack}
        options={{ tabBarLabel: "Boards", tabBarIcon: ({ color }) => tabIcon("B", color) }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: "Settings", tabBarIcon: ({ color }) => tabIcon("S", color) }}
      />
    </Tab.Navigator>
  );
}

function tabIcon(letter: string, color: string) {
  const { Text } = require("react-native");
  return <Text style={{ color, fontSize: 18, fontWeight: "700" }}>{letter}</Text>;
}

export function RootNavigator() {
  const { session, isPending } = useAuth();

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={darkTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
