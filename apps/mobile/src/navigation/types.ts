export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  WorkItemsTab: undefined;
  ChatsTab: undefined;
  BoardsTab: undefined;
  SettingsTab: undefined;
};

export type WorkItemsStackParamList = {
  WorkItemsList: undefined;
  WorkItemDetail: { publicId: string };
};

export type ChatsStackParamList = {
  ThreadList: undefined;
  ThreadDetail: { threadPublicId: string; title?: string };
};

export type BoardsStackParamList = {
  BoardList: undefined;
  BoardDetail: { boardPublicId: string; title?: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};
