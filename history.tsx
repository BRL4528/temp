import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '../../routes/app.routes';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react';
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale/pt-BR';
import { Container, SectionHeader, ButtonReturn, TitleNotHistory, SubTitle } from './styles';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useDigitalOnline } from '@contexts/DigitalOnlineContext';

import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Header } from '../../components/Header';
import { useTheme } from 'styled-components';
import { api } from '../../services/api';
import { toastNative } from '../../components/Toast';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@hooks/useAuth';

interface Scores {
  id: string;
  quantity: string;
  weight: string;
  start_date: string;
  file: string;
  lote: string;
  status: boolean;
}
interface ScoresFormated {
  id: string;
  quantity: string;
  weight: string;
  start_date: string;
  dataCount: string;
  file: string;
  lote: string;
  status: boolean;
}

interface DataDelete {
  id: string;
  quantity: string;
}

export function History() {
  const { digitalOnline } = useDigitalOnline();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { FONT_SIZE, COLORS } = useTheme();
  const iconSize = FONT_SIZE.XL;
  const [scores, setScores] = useState<ScoresFormated[]>([]);
  const [loadingScores, setLoadingScores] = useState(false)
  const { user } = useAuth()
  useFocusEffect(
    useCallback(() => {
      getItemFunction();
    }, [])
  );

  async function getItemFunction() {
    try {
        setLoadingScores(true)
        if (digitalOnline) {
          // axios.get(`http://167.71.20.221/scores`)
          await axios.get(`https://node.pigtek.com.br/scores/filter?farm_id_sender=${user.id}&take=999&page=1`).then((res) => {
            const scoreFormated = res.data.scores.map((score: Scores) => {
              return {
                ...score,
                dataCount: format(new Date(score.start_date), 'dd/MM/yyyy HH:mm', {
                  locale: ptBR
                }),
              }
            })
            setScores(scoreFormated);
          });
        } else {
          const scoresData = await AsyncStorage.getItem('scores');
          if(scoresData) {
            const scoress = scoresData ? JSON.parse(scoresData) : {};
            if (scoress.scores) {
              setScores(scoress.scores);
            } else {
              setScores(scoress)
            }
           
          } else {
            setScores([]);
          }
        }
    } catch (err) {
      try {
        const scoresData = await AsyncStorage.getItem('scores');
        if(scoresData) {
          const scoress = scoresData ? JSON.parse(scoresData) : {};
          if (scoress.scores) {
            setScores(scoress.scores);
          } else {
            setScores(scoress)
          }
        } else {
          setScores([]);
        }
      } catch (err) {
        toastNative({ title: 'Erro', description: 'Problemas ao carregar as contagens' })
      }
    } finally {
      setLoadingScores(false)

    }

  }

  function handleOpenScoreDetails(scoreId: string) {
    if (scoreId) {
      navigation.navigate('score', { scoreId });
    }
  }

  async function changeScreenOrientation() {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  }

  useFocusEffect(
    useCallback(() => {
      changeScreenOrientation();
    }, [])
  );

  async function handleDeleteScore({ id, quantity }: DataDelete) {
    try {
      if (Number(quantity) === 0) {
        if (scores) {
          const scoresFiltred = scores.filter(score => score.id !== id)
          const dataScor = JSON.stringify(scoresFiltred)
          await AsyncStorage.setItem('scores', dataScor);
          setScores(scoresFiltred);

          await axios.delete(`https://node.pigtek.com.br/scores?id=${id}`).then(() => {
              toastNative({ title: 'Contagem excluida', description: 'A contagem foi excluida' })
            })
            getItemFunction()
          }
      } else {
        toastNative({ title: 'Problemas ao excluir', description: 'A contagem não pode ser exluida pois a quantidade é maior que zero' })
      }
    } catch (err) {
      console.log(err)
      toastNative({ title: 'Problemas ao excluir', description: 'Erros ao exluir contagem' })

    }
  }

  const handleButtonAlert = ({ id, quantity }: DataDelete) =>
    Alert.alert('Atenção!', 'Realmente deseja exluir esta contagem?', [
      {
        text: 'Não',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      { text: 'Sim', onPress: () => handleDeleteScore({ id, quantity }) },
    ]);

  const renderItem = ({ item }: { item: ScoresFormated }) => {
    return (
      <TouchableOpacity onPress={() => handleOpenScoreDetails(item.id)} onLongPress={() => handleButtonAlert({ id: item.id, quantity: item.quantity })}>
        <View style={styles.videoItem}>
          <View>
            <View style={styles.videoFlex}>
              <Text style={styles.videoTitle}>Data:</Text>
              <Text style={styles.videoData}>{item.dataCount}</Text>
            </View>
            <View style={styles.videoFlex}>
              <Text style={styles.videoTitle}>Lote:</Text>
              <Text style={styles.videoData}>{item.lote}</Text>
            </View>
            <View style={styles.videoFlex}>
              <Text style={styles.videoTitle}>Contagem total:</Text>
              <Text style={styles.videoData}>{item.quantity}</Text>
            </View>
            <View style={styles.videoFlex}>
              <Text style={styles.videoTitle}>Peso total:</Text>
              <Text style={styles.videoData}>{item.weight}</Text>
            </View>
          </View>
          {item.status ? (
            <Ionicons name="cloud-done" size={iconSize} color={COLORS.BLUE_500} />
          ) : (
            <Ionicons name="cloud-offline" size={iconSize} color={COLORS.RED} />
          )}

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <SectionHeader>
        <ButtonReturn onPress={() => navigation.navigate('options')}>
        <Ionicons name="arrow-back" size={25} color='white' />
      </ButtonReturn>
      </SectionHeader>
      <Container>
        <Header title="Histórico" />

        <SubTitle>Total de contagens: {scores.length}</SubTitle>
        <View style={styles.container}>
          {loadingScores && (
            <ActivityIndicator color="gray" size="large" />
          )}
          {scores?.length === 0 && loadingScores === false ? (
             <TitleNotHistory>Nenhum registro foi encontrado</TitleNotHistory>
          ) : (
            <FlatList
            data={scores}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.1}
          />
          )}
        </View>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  listContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  videoItem: {
    padding: 20,
    marginVertical: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
  },
  videoFlex: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  videoData: {
    marginLeft: 5,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  }
});
