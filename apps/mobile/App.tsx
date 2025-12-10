import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { Entitlements } from '@laser/shared/entitlements';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

type BatchStatus = 'PLANNED' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'DONE' | 'CANCELED';
type BatchPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type OrderStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'WAITING_MATERIALS'
  | 'READY'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELED';
type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type TodayQueueEntityType = 'BATCH' | 'ORDER_ITEM';

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface QueueBatch {
  id: string;
  name: string;
  status: BatchStatus;
  priority: BatchPriority;
  targetDate: string | null;
  season: { id: string; name: string } | null;
  itemsCount: number;
  estimatedMinutesTotal?: number;
}

interface QueueItem {
  id: string;
  title: string;
  quantity: number;
  estimatedMinutes: number | null;
  order: {
    id: string;
    status: OrderStatus;
    priority: OrderPriority;
    createdAt: string;
  } | null;
  template: { id: string; name: string } | null;
  templateVariant: { id: string; name: string } | null;
}

interface TodayQueueResponse {
  generatedAt: string;
  pinned: {
    batches: QueueBatch[];
    items: QueueItem[];
  };
  batchesInProgress: QueueBatch[];
  batchesReady: QueueBatch[];
  urgentItems: QueueItem[];
}

interface BatchItemLinkWithItem {
  id: string;
  orderItem: {
    id: string;
    title: string;
    quantity: number;
    estimatedMinutes: number | null;
    order: {
      id: string;
      status: string;
      priority: string;
      createdAt: string;
    };
  };
}

interface BatchDetail {
  id: string;
  name: string;
  status: BatchStatus;
  priority: BatchPriority;
  targetDate: string | null;
  _count: { items: number; tasks: number };
  estimatedMinutesTotal?: number;
  actualMinutesTotal?: number;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

async function authRequest<T = any>(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  token: string,
  data?: any,
): Promise<T> {
  const res = await axios.request<T>({
    method,
    url: API_URL + path,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data,
  });
  return res.data;
}

type ScreenState =
  | { name: 'today' }
  | { name: 'batchDetail'; batchId: string }
  | { name: 'addOffcut' }
  | { name: 'offcutsList' }
  | { name: 'offcutDetail'; offcutId: string };

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [screen, setScreen] = useState<ScreenState>({ name: 'today' });

  useEffect(() => {
    async function loadStored() {
      try {
        const [a, r, u, e] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('refreshToken'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('entitlements'),
        ]);
        if (a) setAccessToken(a);
        if (r) setRefreshToken(r);
        if (u) {
          try {
            setUser(JSON.parse(u));
          } catch {
            // ignore
          }
        }
        if (e) {
          try {
            setEntitlements(JSON.parse(e));
          } catch {
            // ignore
          }
        }
      } finally {
        setInitializing(false);
      }
    }
    loadStored();
  }, []);

  async function handleLoggedIn(tokens: {
    accessToken: string;
    refreshToken: string;
    user: UserInfo;
    entitlements?: Entitlements | null;
  }) {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setUser(tokens.user);
    setEntitlements(tokens.entitlements ?? null);

    const tasks: Promise<void>[] = [
      AsyncStorage.setItem('accessToken', tokens.accessToken),
      AsyncStorage.setItem('refreshToken', tokens.refreshToken),
      AsyncStorage.setItem('user', JSON.stringify(tokens.user)),
    ];
    if (tokens.entitlements) {
      tasks.push(AsyncStorage.setItem('entitlements', JSON.stringify(tokens.entitlements)));
    } else {
      tasks.push(AsyncStorage.removeItem('entitlements'));
    }
    await Promise.all(tasks);
  }

  async function handleLogout() {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setEntitlements(null);
    setScreen({ name: 'today' });
    await Promise.all([
      AsyncStorage.removeItem('accessToken'),
      AsyncStorage.removeItem('refreshToken'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('entitlements'),
    ]);
  }

  if (initializing) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.subtle}>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!accessToken) {
    return <LoginScreen onLoggedIn={handleLoggedIn} />;
  }

  if (screen.name === 'today') {
    return (
      <TodayQueueScreen
        accessToken={accessToken}
        user={user}
        entitlements={entitlements}
        onAddOffcut={() => setScreen({ name: 'addOffcut' })}
        onOpenOffcutsList={() => setScreen({ name: 'offcutsList' })}
        onLogout={handleLogout}
        onOpenBatchDetailScreen={(id) => setScreen({ name: 'batchDetail', batchId: id })}
      />
    );
  }

  if (screen.name === 'batchDetail') {
    return (
      <BatchDetailScreen
        accessToken={accessToken}
        batchId={screen.batchId}
        onBack={() => setScreen({ name: 'today' })}
      />
    );
  }

  if (screen.name === 'addOffcut') {
    return (
      <AddOffcutScreen
        accessToken={accessToken}
        onBack={() => setScreen({ name: 'today' })}
      />
    );
  }

  if (screen.name === 'offcutsList') {
    return (
      <OffcutsListScreen
        accessToken={accessToken}
        onBack={() => setScreen({ name: 'today' })}
        onAddOffcut={() => setScreen({ name: 'addOffcut' })}
        onOpenOffcutDetail={(id) => setScreen({ name: 'offcutDetail', offcutId: id })}
      />
    );
  }

  if (screen.name === 'offcutDetail') {
    return (
      <OffcutDetailScreen
        accessToken={accessToken}
        offcutId={screen.offcutId}
        onBack={() => setScreen({ name: 'offcutsList' })}
      />
    );
  }

  return null;
}

function LoginScreen({
  onLoggedIn,
}: {
  onLoggedIn: (tokens: {
    accessToken: string;
    refreshToken: string;
    user: UserInfo;
    entitlements?: Entitlements | null;
  }) => void;
}) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wpToken, setWpToken] = useState('demo-wp-user-1');

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(API_URL + '/auth/login', {
        email: email.trim(),
        password,
      });
      const data = res.data as any;
      onLoggedIn({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Login failed';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  async function handleWpSso() {
    if (!wpToken.trim()) {
      setError('Enter your membership token (dev only).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(API_URL + '/auth/wp-sso', {
        wpToken: wpToken.trim(),
      });
      const data = res.data as any;
      onLoggedIn({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        entitlements: data.entitlements ?? null,
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'SSO login failed';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Laser Workshop</Text>
        <Text style={styles.subtitle}>Sign in to start your shift</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
        <View
          style={{
            marginTop: 16,
            borderTopWidth: 1,
            borderTopColor: '#1f2937',
            paddingTop: 12,
          }}
        >
          <Text style={styles.subtle}>Or connect with your LaserfilesPro membership</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            autoCapitalize="none"
            value={wpToken}
            onChangeText={setWpToken}
            placeholder="Dev WP token (treated as wpUserId)"
            placeholderTextColor="#6b7280"
          />
          <TouchableOpacity
            onPress={handleWpSso}
            disabled={loading}
            style={[
              styles.button,
              loading && styles.buttonDisabled,
              {
                marginTop: 8,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#38bdf8',
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#38bdf8" />
            ) : (
              <Text style={[styles.buttonText, { color: '#e5e7eb' }]}>Continue with membership</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.subtle, { fontSize: 10, marginTop: 6 }]}>
            Dev note: in production this will redirect through the WordPress SSO gateway instead of asking for a raw
            token.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TodayQueueScreen({
  accessToken,
  user,
  entitlements,
  onAddOffcut,
  onOpenOffcutsList,
  onOpenBatchDetailScreen,
  onLogout,
}: {
  accessToken: string;
  user: UserInfo | null;
  entitlements: Entitlements | null;
  onAddOffcut: () => void;
  onOpenOffcutsList: () => void;
  onOpenBatchDetailScreen: (id: string) => void;
  onLogout: () => void;
}) {
  const [data, setData] = useState<TodayQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinningKey, setPinningKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await authRequest<TodayQueueResponse>('get', '/today-queue', accessToken);
      setData(res);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load today queue';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pin(entityType: TodayQueueEntityType, id: string) {
    setPinningKey(`${entityType}:${id}`);
    try {
      await authRequest('post', '/today-queue/pin', accessToken, { entityType, id });
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to pin';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setPinningKey(null);
    }
  }

  async function unpin(entityType: TodayQueueEntityType, id: string) {
    setPinningKey(`${entityType}:${id}`);
    try {
      await authRequest('delete', '/today-queue/pin', accessToken, { entityType, id });
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to unpin';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setPinningKey(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Today Queue</Text>
          <Text style={styles.subtitle}>
            {user ? `Hello, ${user.name || user.email}` : 'Signed in worker'}
          </Text>
          {entitlements && (
            <View
              style={{
                marginTop: 4,
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#1f2937',
                backgroundColor: '#0f172a',
              }}
            >
              <Text style={{ fontSize: 10, color: '#38bdf8' }}>{entitlements.plan} plan</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onOpenOffcutsList} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>Offcuts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddOffcut} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>Add offcut</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.subtle}>Loading today queue…</Text>
        </View>
      )}
      {!loading && error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && data && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {data.pinned.batches.length > 0 || data.pinned.items.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pinned</Text>
              {data.pinned.batches.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.cardRow}
                  onPress={() => onOpenBatchDetailScreen(b.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{b.name}</Text>
                    <Text style={styles.cardSubtle}>
                      {formatStatus(b.status)} · {b.priority} · Items {b.itemsCount}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => unpin('BATCH', b.id)}
                    disabled={pinningKey === `BATCH:${b.id}`}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Unpin</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              {data.pinned.items.map((it) => (
                <View key={it.id} style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{it.title}</Text>
                    <Text style={styles.cardSubtle}>
                      Qty {it.quantity}
                      {it.order
                        ? ` · Order ${it.order.id.slice(0, 8)}… · ${formatStatus(it.order.status)}`
                        : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => unpin('ORDER_ITEM', it.id)}
                    disabled={pinningKey === `ORDER_ITEM:${it.id}`}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Unpin</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Batches in progress</Text>
            {data.batchesInProgress.length === 0 && (
              <Text style={styles.subtle}>No batches in progress.</Text>
            )}
            {data.batchesInProgress.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.cardRow}
                onPress={() => onOpenBatchDetailScreen(b.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.name}</Text>
                  <Text style={styles.cardSubtle}>
                    Items {b.itemsCount}
                    {typeof b.estimatedMinutesTotal === 'number'
                      ? ` · Est ${b.estimatedMinutesTotal} min`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => pin('BATCH', b.id)}
                  disabled={pinningKey === `BATCH:${b.id}`}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Pin</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Batches ready to cut</Text>
            {data.batchesReady.length === 0 && <Text style={styles.subtle}>No ready batches.</Text>}
            {data.batchesReady.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.cardRow}
                onPress={() => onOpenBatchDetailScreen(b.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.name}</Text>
                  <Text style={styles.cardSubtle}>
                    Items {b.itemsCount}
                    {b.targetDate
                      ? ` · Target ${new Date(b.targetDate).toLocaleDateString()}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => pin('BATCH', b.id)}
                  disabled={pinningKey === `BATCH:${b.id}`}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Pin</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urgent items not batched</Text>
            {data.urgentItems.length === 0 && (
              <Text style={styles.subtle}>
                No urgent unbatched items. Great time to prep the next batch.
              </Text>
            )}
            {data.urgentItems.map((it) => (
              <View key={it.id} style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{it.title}</Text>
                  <Text style={styles.cardSubtle}>
                    Qty {it.quantity}
                    {it.order
                      ? ` · Order ${it.order.id.slice(0, 8)}… · ${formatStatus(it.order.status)}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => pin('ORDER_ITEM', it.id)}
                  disabled={pinningKey === `ORDER_ITEM:${it.id}`}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Pin</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function BatchDetailScreen({
  accessToken,
  batchId,
  onBack,
}: {
  accessToken: string;
  batchId: string;
  onBack: () => void;
}) {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [items, setItems] = useState<BatchItemLinkWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [b, it] = await Promise.all([
          authRequest<BatchDetail>('get', `/batches/${batchId}`, accessToken),
          authRequest<BatchItemLinkWithItem[]>('get', `/batches/${batchId}/items`, accessToken),
        ]);
        setBatch(b);
        setItems(it);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load batch';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken, batchId]);

  async function updateStatus(newStatus: BatchStatus) {
    try {
      await authRequest('patch', `/batches/${batchId}`, accessToken, { status: newStatus });
      const updated = await authRequest<BatchDetail>('get', `/batches/${batchId}`, accessToken);
      setBatch(updated);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update status';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function startTimer(orderId: string, itemId: string) {
    try {
      await authRequest('post', `/time-logs/orders/${orderId}/items/${itemId}/start`, accessToken);
      alert('Timer started');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to start timer';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function stopTimer(orderId: string, itemId: string) {
    try {
      await authRequest('post', `/time-logs/orders/${orderId}/items/${itemId}/stop`, accessToken);
      alert('Timer stopped');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to stop timer';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Batch detail</Text>
        <View style={{ width: 72 }} />
      </View>
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.subtle}>Loading batch…</Text>
        </View>
      )}
      {!loading && error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && batch && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{batch.name}</Text>
            <Text style={styles.subtle}>
              {formatStatus(batch.status)} · Priority {batch.priority} · Items {batch._count.items}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
              <TouchableOpacity
                onPress={() => updateStatus('READY')}
                style={styles.smallPillButton}
              >
                <Text style={styles.smallPillButtonText}>Mark READY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateStatus('IN_PROGRESS')}
                style={styles.smallPillButton}
              >
                <Text style={styles.smallPillButtonText}>Start batch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateStatus('DONE')}
                style={styles.smallPillButton}
              >
                <Text style={styles.smallPillButtonText}>Mark DONE</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items in batch</Text>
            {items.length === 0 && <Text style={styles.subtle}>No items in this batch yet.</Text>}
            {items.map((link) => (
              <View key={link.id} style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{link.orderItem.title}</Text>
                  <Text style={styles.cardSubtle}>
                    Qty {link.orderItem.quantity}
                    {' · '}Order {link.orderItem.order.id.slice(0, 8)}…
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => startTimer(link.orderItem.order.id, link.orderItem.id)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => stopTimer(link.orderItem.order.id, link.orderItem.id)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

interface MaterialOption {
  id: string;
  name: string;
  category: string;
  thicknessMm: number;
}

interface MaterialsListResponse {
  data: MaterialOption[];
}

interface OffcutListResponse {
  data: any[];
  total: number;
}

type OffcutShapeType = 'RECTANGLE' | 'IRREGULAR';
type OffcutCondition = 'GOOD' | 'OK' | 'DAMAGED';
type OffcutStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'DISCARDED';

function OffcutsListScreen({
  accessToken,
  onBack,
  onAddOffcut,
  onOpenOffcutDetail,
}: {
  accessToken: string;
  onBack: () => void;
  onAddOffcut: () => void;
  onOpenOffcutDetail: (id: string) => void;
}) {
  const [offcuts, setOffcuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await authRequest<OffcutListResponse>(
          'get',
          '/offcuts?status=AVAILABLE',
          accessToken,
        );
        setOffcuts(res.data || []);
      } catch (err: any) {
        const data = err?.response?.data;
        if (data?.code === 'FEATURE_LOCKED') {
          setError(
            'Funcționalitatea Scrap & Offcuts nu este inclusă în planul tău curent. Fă upgrade pentru a vedea și gestiona offcuts.',
          );
        } else {
          const message = data?.message || 'Failed to load offcuts';
          setError(Array.isArray(message) ? message.join(', ') : String(message));
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [accessToken]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Offcuts</Text>
        <TouchableOpacity onPress={onAddOffcut} style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.subtle}>Loading offcuts…</Text>
        </View>
      )}
      {!loading && error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available offcuts</Text>
            {offcuts.length === 0 && (
              <Text style={styles.subtle}>
                No offcuts available yet. Use "Add" to log a reusable leftover.
              </Text>
            )}
            {offcuts.map((o) => {
              const width = o.widthMm ?? o.boundingBoxWidthMm ?? null;
              const height = o.heightMm ?? o.boundingBoxHeightMm ?? null;
              let sizeLabel = '-';
              if (width && height) {
                sizeLabel = `${width} × ${height} mm`;
              } else if (o.estimatedAreaMm2) {
                sizeLabel = `~${(o.estimatedAreaMm2 / 1_000_000).toFixed(2)} m²`;
              }
              const status = (o.status || 'AVAILABLE') as OffcutStatus;
              const materialName = o.material?.name || 'Material';
              return (
                <TouchableOpacity
                  key={o.id}
                  style={styles.cardRow}
                  onPress={() => onOpenOffcutDetail(o.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {materialName} · {o.thicknessMm}mm
                    </Text>
                    <Text style={styles.cardSubtle}>
                      {sizeLabel}
                      {o.locationLabel ? ` · ${o.locationLabel}` : ''}
                    </Text>
                    <Text style={styles.cardSubtle}>
                      {status} · {o.condition}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function OffcutDetailScreen({
  accessToken,
  offcutId,
  onBack,
}: {
  accessToken: string;
  offcutId: string;
  onBack: () => void;
}) {
  const [offcut, setOffcut] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [usedArea, setUsedArea] = useState('');
  const [note, setNote] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await authRequest<any>('get', `/offcuts/${offcutId}`, accessToken);
      setOffcut(res);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setError(
          'Funcționalitatea Scrap & Offcuts nu este inclusă în planul tău curent. Fă upgrade pentru a vedea și gestiona offcuts.',
        );
      } else {
        const message = data?.message || 'Failed to load offcut';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken, offcutId]);

  async function handleReserve() {
    if (!offcut) return;
    setActionKey('reserve');
    setError(null);
    try {
      await authRequest('post', `/offcuts/${offcutId}/reserve`, accessToken, {});
      await load();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setError(
          'Funcționalitatea Scrap & Offcuts nu este inclusă în planul tău curent. Fă upgrade pentru a vedea și gestiona offcuts.',
        );
      } else {
        const message = data?.message || 'Failed to reserve offcut';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleUseFull() {
    if (!offcut) return;
    setActionKey('full');
    setError(null);
    try {
      await authRequest('post', `/offcuts/${offcutId}/use-full`, accessToken, {
        notes: note || undefined,
      });
      await load();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setError(
          'Funcționalitatea Scrap & Offcuts nu este inclusă în planul tău curent. Fă upgrade pentru a vedea și gestiona offcuts.',
        );
      } else {
        const message = data?.message || 'Failed to use offcut';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleUsePartial() {
    if (!offcut) return;
    const area = Number(usedArea || '0');
    if (!area || area <= 0) {
      setError('Enter used area in mm²');
      return;
    }
    setActionKey('partial');
    setError(null);
    try {
      await authRequest('post', `/offcuts/${offcutId}/use-partial`, accessToken, {
        usedAreaMm2: area,
        notes: note || undefined,
      });
      await load();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setError(
          'Funcționalitatea Scrap & Offcuts nu este inclusă în planul tău curent. Fă upgrade pentru a vedea și gestiona offcuts.',
        );
      } else {
        const message = data?.message || 'Failed to use offcut partially';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setActionKey(null);
    }
  }

  const status = (offcut?.status || 'AVAILABLE') as OffcutStatus;
  const disableUsage = status === 'USED' || status === 'DISCARDED';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Offcut detail</Text>
        <View style={{ width: 72 }} />
      </View>
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.subtle}>Loading offcut…</Text>
        </View>
      )}
      {!loading && error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && offcut && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.subtle}>
              {offcut.material?.name || 'Material'} · {offcut.thicknessMm}mm
            </Text>
            <Text style={styles.subtle}>
              Status {status} · Condition {offcut.condition}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Size & location</Text>
            <Text style={styles.subtle}>
              {(() => {
                const w = offcut.widthMm ?? offcut.boundingBoxWidthMm ?? null;
                const h = offcut.heightMm ?? offcut.boundingBoxHeightMm ?? null;
                if (w && h) return `${w} × ${h} mm`;
                if (offcut.estimatedAreaMm2) {
                  return `~${(offcut.estimatedAreaMm2 / 1_000_000).toFixed(2)} m²`;
                }
                return 'Size approx.';
              })()}
            </Text>
            <Text style={styles.subtle}>
              {offcut.locationLabel ? offcut.locationLabel : 'Location not set'}
            </Text>
            {offcut.notes && <Text style={styles.subtle}>{offcut.notes}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <Text style={styles.subtle}>
              Quick actions to reserve or mark this offcut as used. Area is approximate.
            </Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { marginTop: 4, height: 60, textAlignVertical: 'top' }]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="e.g. used for batch X, edges charred"
              placeholderTextColor="#6b7280"
            />
            <Text style={[styles.label, { marginTop: 8 }]}>Used area for partial (mm²)</Text>
            <TextInput
              style={[styles.input, { marginTop: 4 }]}
              keyboardType="numeric"
              value={usedArea}
              onChangeText={setUsedArea}
            />
            {error && (
              <Text style={styles.error}>{error}</Text>
            )}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity
                onPress={handleReserve}
                disabled={actionKey === 'reserve' || status !== 'AVAILABLE'}
                style={[styles.smallPillButton, (actionKey === 'reserve' || status !== 'AVAILABLE') && styles.buttonDisabled]}
              >
                <Text style={styles.smallPillButtonText}>Reserve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUseFull}
                disabled={actionKey === 'full' || disableUsage}
                style={[styles.smallPillButton, (actionKey === 'full' || disableUsage) && styles.buttonDisabled]}
              >
                <Text style={styles.smallPillButtonText}>Use full</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUsePartial}
                disabled={actionKey === 'partial' || disableUsage}
                style={[styles.smallPillButton, (actionKey === 'partial' || disableUsage) && styles.buttonDisabled]}
              >
                <Text style={styles.smallPillButtonText}>Use partial</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AddOffcutScreen({
  accessToken,
  onBack,
}: {
  accessToken: string;
  onBack: () => void;
}) {
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const [shapeType, setShapeType] = useState<OffcutShapeType>('RECTANGLE');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [bboxWidth, setBboxWidth] = useState('');
  const [bboxHeight, setBboxHeight] = useState('');
  const [estimatedArea, setEstimatedArea] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState<OffcutCondition>('GOOD');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setMaterialsLoading(true);
      setMaterialsError(null);
      try {
        const [materialsRes, lastMaterialId] = await Promise.all([
          authRequest<MaterialsListResponse>('get', '/materials', accessToken),
          AsyncStorage.getItem('lastOffcutMaterialId'),
        ]);

        const list = materialsRes.data ?? materialsRes.data === undefined
          ? (materialsRes as any).data ?? []
          : materialsRes.data;

        const mapped: MaterialOption[] = (list as any[]).map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          thicknessMm: m.thicknessMm,
        }));

        setMaterials(mapped);

        if (lastMaterialId && mapped.some((m) => m.id === lastMaterialId)) {
          setMaterialId(lastMaterialId);
        } else if (mapped.length > 0) {
          setMaterialId(mapped[0].id);
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load materials';
        setMaterialsError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setMaterialsLoading(false);
      }
    }

    load();
  }, [accessToken]);

  async function handleSave() {
    if (!materialId) {
      setError('Select a material');
      return;
    }

    const material = materials.find((m) => m.id === materialId);
    if (!material) {
      setError('Invalid material');
      return;
    }

    const qty = parseInt(quantity || '1', 10) || 1;

    const widthMm = shapeType === 'RECTANGLE' && width ? Number(width) : undefined;
    const heightMm = shapeType === 'RECTANGLE' && height ? Number(height) : undefined;
    const bboxWidthMm = shapeType === 'IRREGULAR' && bboxWidth ? Number(bboxWidth) : undefined;
    const bboxHeightMm = shapeType === 'IRREGULAR' && bboxHeight ? Number(bboxHeight) : undefined;
    const estimatedAreaMm2 = estimatedArea ? Number(estimatedArea) : undefined;

    setSaving(true);
    setError(null);
    try {
      await authRequest('post', '/offcuts', accessToken, {
        materialId: material.id,
        thicknessMm: material.thicknessMm,
        shapeType,
        widthMm,
        heightMm,
        boundingBoxWidthMm: bboxWidthMm,
        boundingBoxHeightMm: bboxHeightMm,
        estimatedAreaMm2,
        quantity: qty,
        locationLabel: location || undefined,
        condition,
        notes: notes || undefined,
      });

      await AsyncStorage.setItem('lastOffcutMaterialId', material.id);

      setWidth('');
      setHeight('');
      setBboxWidth('');
      setBboxHeight('');
      setEstimatedArea('');
      setQuantity('1');
      setLocation('');
      setNotes('');

      alert('Offcut saved');
      onBack();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setError(
          'Funcționalitatea Scrap & Offcuts nu este inclusă în planul tău curent. Fă upgrade pentru a adăuga offcuts.',
        );
      } else if (data?.code === 'LIMIT_REACHED' && data?.limitKey === 'max_offcuts_tracked') {
        const limit = data?.limit;
        setError(
          typeof limit === 'number'
            ? `Ai atins limita de ${limit} offcuts urmărite pentru planul tău. Marchează unele ca „USED” sau „DISCARDED” sau fă upgrade de plan.`
            : 'Ai atins limita de offcuts urmărite pentru planul tău. Marchează unele ca „USED” sau „DISCARDED” sau fă upgrade de plan.',
        );
      } else {
        const message = data?.message || 'Failed to save offcut';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add offcut</Text>
        <View style={{ width: 72 }} />
      </View>
      {materialsLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.subtle}>Loading materials…</Text>
        </View>
      )}
      {!materialsLoading && materialsError && <Text style={styles.error}>{materialsError}</Text>}
      {!materialsLoading && !materialsError && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic info</Text>
            <Text style={styles.subtle}>
              Resturi reutilizabile (scrap) pentru lemn, MDF, acril. Dimensiunile și aria sunt
              aproximative.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Material</Text>
            <View
              style={{
                marginTop: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#374151',
                overflow: 'hidden',
              }}
            >
              <ScrollView>
                {materials.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMaterialId(m.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      backgroundColor: m.id === materialId ? '#0f172a' : '#020617',
                      borderBottomWidth: 1,
                      borderBottomColor: '#111827',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: m.id === materialId ? '#38bdf8' : '#e5e7eb',
                      }}
                    >
                      {m.name} · {m.category} · {m.thicknessMm}mm
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Shape</Text>
            <View style={[styles.pillToggle, { marginTop: 6 }]}>
              <TouchableOpacity
                onPress={() => setShapeType('RECTANGLE')}
                style={[
                  styles.pillToggleOption,
                  shapeType === 'RECTANGLE' && styles.pillToggleOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.pillToggleOptionText,
                    shapeType === 'RECTANGLE' && styles.pillToggleOptionTextActive,
                  ]}
                >
                  Rectangle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShapeType('IRREGULAR')}
                style={[
                  styles.pillToggleOption,
                  shapeType === 'IRREGULAR' && styles.pillToggleOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.pillToggleOptionText,
                    shapeType === 'IRREGULAR' && styles.pillToggleOptionTextActive,
                  ]}
                >
                  Irregular
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {shapeType === 'RECTANGLE' && (
            <View style={styles.section}>
              <Text style={styles.label}>Dimensions (mm)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subtle}>Width</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={width}
                    onChangeText={setWidth}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subtle}>Height</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
              </View>
            </View>
          )}

          {shapeType === 'IRREGULAR' && (
            <View style={styles.section}>
              <Text style={styles.label}>Bounding box (mm)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subtle}>Width</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={bboxWidth}
                    onChangeText={setBboxWidth}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subtle}>Height</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={bboxHeight}
                    onChangeText={setBboxHeight}
                  />
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Estimated area (mm², optional)</Text>
            <TextInput
              style={[styles.input, { marginTop: 4 }]}
              keyboardType="numeric"
              value={estimatedArea}
              onChangeText={setEstimatedArea}
            />
          </View>

          <View style={styles.section}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={[styles.input, { marginTop: 4 }]}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Condition</Text>
                <View style={[styles.pillToggle, { marginTop: 4 }]}>
                  {(['GOOD', 'OK', 'DAMAGED'] as OffcutCondition[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCondition(c)}
                      style={[
                        styles.pillToggleOption,
                        condition === c && styles.pillToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillToggleOptionText,
                          condition === c && styles.pillToggleOptionTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location (rack/shelf)</Text>
            <TextInput
              style={[styles.input, { marginTop: 4 }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Rack A2, Shelf 3"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { marginTop: 4, height: 80, textAlignVertical: 'top' }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. leftover from order 123, edges slightly burnt"
              placeholderTextColor="#6b7280"
            />
          </View>

          {error && (
            <View style={styles.section}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.button, saving && styles.buttonDisabled]}
            >
              {saving ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.buttonText}>Save offcut</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  label: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  input: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#e5e7eb',
    backgroundColor: '#020617',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#38bdf8',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#fca5a5',
  },
  subtle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBarButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topBarButtonText: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  cardSubtle: {
    marginTop: 2,
    fontSize: 11,
    color: '#9ca3af',
  },
  smallButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: {
    fontSize: 11,
    color: '#e5e7eb',
  },
  smallPillButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
  },
  smallPillButtonText: {
    fontSize: 11,
    color: '#e5e7eb',
  },
  pillToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
  },
  pillToggleOption: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pillToggleOptionActive: {
    backgroundColor: '#38bdf8',
  },
  pillToggleOptionText: {
    fontSize: 11,
    color: '#e5e7eb',
  },
  pillToggleOptionTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
});
