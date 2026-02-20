import "react-native-url-polyfill/auto";

import React from "react";
import { registerRootComponent } from "expo";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "~/hooks/useAuth";
import { WorkspaceProvider } from "~/hooks/useWorkspace";
import { TRPCProvider } from "~/lib/trpc";
import { RootNavigator } from "~/navigation/RootNavigator";

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TRPCProvider>
          <WorkspaceProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </WorkspaceProvider>
        </TRPCProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
