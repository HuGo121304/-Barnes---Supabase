import React, { useEffect, useState } from 'react';
import { FlatList, Text } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

interface Todo {
  id: number;
  title: string;
}

export default function Index() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const getTodos = async () => {
    try {
      const { data, error } = await supabase.from('todos').select().order('id', { ascending: true });
      if (error) {
        console.error('Error fetching todos:', error.message);
        return;
      }
      setTodos(data || []);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching todos:', error.message);
      } else {
        console.error('Error fetching todos:', error);
      }
    }
  };

  useEffect(() => {
    getTodos();
    const channel = supabase
      .channel('realtime-todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          console.log('Realtime change received:', payload);

          if (payload.eventType === 'INSERT') {
            setTodos((prev) => [...prev, payload.new as Todo]);
          }
          if (payload.eventType === 'UPDATE') {
            setTodos((prev) =>
              prev.map((todo) => (todo.id === payload.new.id ? (payload.new as Todo) : todo))
            );
          }
          if (payload.eventType === 'DELETE') {
            setTodos((prev) => prev.filter((todo) => todo.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 30, marginBottom: 10 }}>Todo List:</Text>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text style={{ fontSize: 16, marginVertical: 4, textAlign: 'center' }}>{item.title}</Text>
        )}
      />
    </SafeAreaView>
  );
}
