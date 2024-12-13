import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  FlatList,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  Container,
  TextCount,
  TextFps,
  Button,
  Section,
  SectionList,
  ButtonBlue,
  ButtonRed,
  ButtonYellow,
  SectionFlag,
  ContainerFlag,
  TextFlag,
  SectionCamera,
  ButtonReturn,
  TitleNameProd,
  // ButtonCamera,
  ButtonPink,
  SectionPlus,
  ButtonTrasparent,
} from './styles';
import { Header } from '../../components/Header';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTheme } from 'styled-components';
import { toastNative } from '../../components/Toast';
import { AppNavigatorRoutesProps } from '../../routes/app.routes';
import * as ScreenOrientation from 'expo-screen-orientation';
import { observable } from '@legendapp/state';
import { api } from '../../services/api';
import { persistObservable } from '@legendapp/state/persist';
import uuid from 'react-native-uuid';
import { useAuth } from '../../hooks/useAuth';
import { useNetInfo } from '@react-native-community/netinfo';
import axios from 'axios';
import { Camera } from '@screens/camera';
import { ModalWeight } from './modalWeight';
import { useDigitalOnline } from '@contexts/DigitalOnlineContext';
import { useI18n } from '@contexts/i18n';

type RouteParamsProps = {
  productor_id?: string;
  productorName?: string;
  number_nf?: string;
  type: string;
  lote: string;
  name?: string;
  farmName?: string;
  farmId?: string;
  balance?: string;
};

interface Config {
  rout: string;
  cfg: string;
  names: string;
  weights: string;
  routViewVideo: string;
  mountVideo: string;
  scaleRout: string;
  isSelectedViewVideo: boolean;
  markingAutomatic: 'not' | 'yes';
  rangeForMarking: string;
}
export interface Flags {
  quantity: number;
  sequence: number;
  score_id: string;
  weight: number;
  id: string;
  created_at: string;
  updated_at: string;
  gender: string;
}

export interface PropsFetchScores {
  score: {
    id: string;
    producer_id_internal: string;
    farm_id_internal: string;
    type: string;
    lote: string;
    name: string;
    status: boolean;
    producer_id_sender: string;
    farm_id_sender: string;
    producer_id_received: string | null;
    farm_id_received: string | null;
    quantity: number;
    weight: string;
    start_date: string;
    created_at: string;
    updated_at: string;
    markings: never[];
  };
}

interface Scores {
  scores: [
    {
      id: string;
      name: string;
      lote: string;
    }
  ];
}
export function Home() {
  const { FONT_SIZE } = useTheme();
  const iconSize = FONT_SIZE.XL;
  const [count, setCount] = useState<number>(0);
  const [countCurrent, setCountCurrent] = useState<number>(0);
  const [acumuled, setAcumuled] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [textHeader, setTextHeader] = useState('Iniciar contagem');
  const [dataConfig, setDataConfigs] = useState<Config>();
  const [dataConfigUrl, setDataConfigsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRoud, setLoadingRoud] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [coutingId, setCoutingId] = useState('');
  const [loteFormated, setLotFormated] = useState('');
  const [sex, setSex] = useState('male');
  const [maleQuantity, setMaleQuantity] = useState(0);
  const [femaleQuantity, setFemaleQuantity] = useState(0);

  const [flagsData, sesetFlagsData] = useState<Flags[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [flagOpen, setFlagOpen] = useState('');

  const socket = useRef<WebSocket | null>(null);

  const { t } = useI18n();

  const sexRef = useRef(sex);
  const flatListRef = useRef(null);

  const { digitalOnline } = useDigitalOnline();
  const toggleSex = () => {
    setSex(prevSex => (prevSex === 'male' ? 'female' : 'male'));
  };

  const { user } = useAuth();
  const netInfo = useNetInfo();
  const state = observable({
    scores: [
      {
        id: '',
        producer_id_internal: '',
        farm_id_internal: '',
        type: '',
        lote: '',
        name: '',
        status: false,
        producer_id_sender: '',
        farm_id_sender: '',
        producer_id_received: '',
        farm_id_received: '',
        quantity: 0,
        weight: '0',
        start_date: '',
        created_at: '',
        updated_at: '',
        markings: [],
      },
    ],
  });

  persistObservable(state, {
    local: 'scores',
  });

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const routes = useRoute();
  const {
    productor_id,
    productorName,
    type,
    lote,
    name,
    farmName,
    farmId,
    balance,
  } = routes.params as RouteParamsProps;

  const [url, setUrl] = useState('')

  useEffect(() => {
    async function updateUrl() {
      const route = await AsyncStorage.getItem('@DataConfigRoute');
      if (route !== null) {
        setUrl(`http://${route.slice(0, -5)}:8080`)
      }
    }
    updateUrl()
  }, [])

  // useEffect(() => {
  //   if(count > maleQuantity) {
  //     if (sex === 'male') {
  //       setMaleQuantity(maleQuantity + 1) 
  //     } else {
  //       setFemaleQuantity(femaleQuantity + 1) 
  //     }
  //   } else if (count < maleQuantity) {
  //     if (sex === 'male') {
  //       setMaleQuantity(maleQuantity - 1) 
  //     } else {
  //       setFemaleQuantity(femaleQuantity - 1) 
  //     }
  //   }
  // }, [count])
  useEffect(() => {
    sexRef.current = sex;
  }, [sex]);

  const updateCounts = (newCount: number) => {
    setCount((prevCount) => {
      const diff = newCount - prevCount;

      setCountCurrent((prevCountCurrent) => prevCountCurrent + diff);

      setAcumuled((prevAcumuled) => prevAcumuled + diff);

      if (sexRef.current === 'male') {
        setMaleQuantity((prevMaleQuantity) => prevMaleQuantity + diff);
      } else {
        setFemaleQuantity((prevFemaleQuantity) => prevFemaleQuantity + diff);
      }

      return newCount;
    });
  };
  async function getItemFunction() {
    const data = await AsyncStorage.getItem('@DataConfig');
    const route = await AsyncStorage.getItem('@DataConfigRoute');
    if (data !== null && route !== null) {
      const dataJson: Config = JSON.parse(data);
      setDataConfigs(dataJson);
      setDataConfigsUrl(route);
    }
  }

  async function createWebSocket() {
    try {
      const route = await AsyncStorage.getItem('@DataConfigRoute');
      if (route !== undefined) {
        if (route === '') {
          alert(t('home_textAlert_01'));
          return;
        }
        socket.current = new WebSocket(`ws://${route}/`);
        socket.current.onopen = () => {
          console.log('Conexão estabelecida com o servidor WebSocket');
        };

        socket.current.onmessage = (event) => {
          const dataArray = event.data.split(' ');

          if (dataArray[0] === 'data') {
            if (dataArray[3] === 'counting' && dataArray[4] && dataArray[5] !== t('home_textHeader_01')) {
              setCoutingId(dataArray[4])
              setTextHeader(t('home_textHeader_01'));
              setLoading(true);
            }

            const newCount = parseInt(dataArray[1], 10);

            if (newCount !== count) {
              updateCounts(newCount);
            }


            // setCount(parseInt(dataArray[1], 10));

            setFps(parseInt(dataArray[2], 10));
            // setCoutingId(dataArray[3]);
          }
          if (dataArray[0] === 'station_started' && socket) {
            socket.current?.send('startCounting');
            setTextHeader(t('home_textHeader_01'));
            setLoading(true);
          }
          if (dataArray[0] === 'finalized' && socket) {
            setTextHeader(t('home_textHeader_02'));
            setLoading(false);
          }
          if (dataArray[0] === 'program_finalized' && socket) {
            setTextHeader(t('home_textHeader_02'));
            setLoading(false);
          }
        };

        socket.current.onclose = () => {
          console.log('Conexão WebSocket fechada');
          socket.current = null;
        };
      }
    } catch (e) {
      console.log('Erro createWebSocket', e);
    }
  };

  const handleVerifyLot = useCallback(async () => {
    if (textHeader === (t('home_textHeader_03')) {
      const scores = await AsyncStorage.getItem('scores');
      const scoresArray: Scores = scores ? JSON.parse(scores) : {scores: []};
      if (scoresArray.scores.length > 0) {
        if (
          scoresArray.scores.length === 1 &&
          scoresArray.scores[0].id === ''
        ) {
          setLotFormated(`${lote}/0`);
        } else {
          if (scoresArray.scores.length > 0) {
            const formated = scoresArray.scores.filter((scor) => {
              if (scor.lote.split('/')[0] === lote) {
                return scor;
              }
            });
            setLotFormated(`${lote}/${formated.length + 1}`);
          } else {
            setLotFormated(`${lote}/0`);
          }
        }
      } else {
        setLotFormated(`${lote}/0`);
      }
    }
  }, [textHeader, lote]);

  useFocusEffect(
    useCallback(() => {
      getItemFunction();
      createWebSocket();
    }, [])
  );

  useEffect(() => {
    handleVerifyLot();
  }, [textHeader, lote]);



  async function handleRoudProgram() {
    try {
      const idScores = uuid.v4();
      setLoadingRoud(true);
      setCoutingId(String(idScores));

      const scoreData = {
        score: {
          producer_id_internal: user.producer_id,
          farm_id_internal: user.id,
          type,
          lote: loteFormated,
          name: name ? name : `${loteFormated}-${farmName}`,
          producer_id_sender: user.producer_id,
          farm_id_sender: user.id,
          producer_id_received: productor_id || null,
          farm_id_received: farmId || null,
          progress: 'not_found',
          quantity: 0,
          weight: '0',
          start_date: String(new Date()),
          status: false,

          id: String(idScores),
          created_at: String(new Date()),
          updated_at: String(new Date()),
          markings: [],
        },
      };
      await api
        .get(`/spawn`, {
          params: {
            cfg: dataConfig?.cfg,
            names: dataConfig?.names,
            weights: dataConfig?.weights,
            saveVideo: dataConfig?.isSelectedViewVideo,
            roteViewVideo: dataConfig?.routViewVideo,
            mountVideo: dataConfig?.mountVideo,
            scaleRout: dataConfig?.scaleRout,
            idScores,
            qtdCurrent: 0
          },
        })

        .then(async (response) => {
          try {
            if (response.status === 200) {
              if (digitalOnline) {
                await axios
                  .post('https://node.pigtek.com.br/scores', scoreData.score)
                  .then(() => {
                    const score = {
                      ...scoreData.score,
                      status: true,
                    };
                    handleSaveLocal({ score });
                    setTimeout(async () => {
                      await axios.get('https://node.pigtek.com.br/scores/validate');
                    }, 3000)
                  });
              } else {
                handleSaveLocal(scoreData);
              }
            }
          } catch (err) {
            const score = {
              ...scoreData.score,
              status: false,
            };
            handleSaveLocal({ score });
            console.log('Erro handleRoudProgram: ', err)
          }
        });

      createWebSocket();
    } catch (err) {
      console.log('Erro handleRoudProgram:', err);
      Alert.alert('Conexão falhada', 'Verifique a conexão com o contador.');

      setLoadingRoud(false);
    }
  }

  const handleContinuosProgram = useCallback(async () => {
    try {
      setLoadingRoud(true);
      setLoadingSave(true);
      await api
      .get(`/spawn`, {
        params: {
          cfg: dataConfig?.cfg,
          names: dataConfig?.names,
          weights: dataConfig?.weights,
          saveVideo: dataConfig?.isSelectedViewVideo,
          roteViewVideo: dataConfig?.routViewVideo,
          mountVideo: dataConfig?.mountVideo,
          scaleRout: dataConfig?.scaleRout,
          idScores: coutingId,
          qtdCurrent: acumuled,
        },
      })
      createWebSocket();
    } catch (err) {
      console.log('Erro handleContinuosProgram', err)
    } finally {
      setLoadingRoud(false);
      setLoadingSave(false)
    }
  }, [acumuled])

  function handleSaveLocal({ score }: PropsFetchScores) {
    //@ts-ignore
    state.scores.set((currentExpenses) => [...currentExpenses, score]);
  }

  async function handleSave() {
    try {
      setLoadingSave(true);

      const weightTotal = flagsData.reduce((accumulator, currentValue) => {
        return Number(accumulator) + Number(currentValue.weight);
      }, 0);

      // const weightTotalMale = flagsData
      //   .filter((a) => a.gender === 'male')
      //   .reduce((accumulator, currentValue) => {
      //     return Number(accumulator) + Number(currentValue.weight);
      //   }, 0);

      // const weightTotalFemale = flagsData
      //   .filter((a) => a.gender === 'female')
      //   .reduce((accumulator, currentValue) => {
      //     return Number(accumulator) + Number(currentValue.weight);
      //   }, 0);
      // console.log('weightTotalMale', weightTotalMale)
      // console.log('weightTotalFemale', weightTotalFemale)
      // console.log('flagsData', flagsData)

      const dataScore = {
        quantity: acumuled,
        weight: weightTotal,
        end_date: new Date(),
        updated_at: new Date(),
        markings: flagsData,
        status: true,
        male: maleQuantity,
        female: femaleQuantity,
      };
      if (digitalOnline) {

        axios.get('https://node.pigtek.com.br/scores/validate');

        await axios
          .put(`https://node.pigtek.com.br/scores?id=${coutingId}`, dataScore)
          .then((response) => {
            if (response.status === 200) {
              handleUpdateLocal(coutingId, dataScore);
            }
          });
        await axios.post(
          `https://node.pigtek.com.br/markings/createAll`,
          flagsData
        );
      } else {
        const dataScoreFormated = {
          ...dataScore,
          status: false,
        };
        handleUpdateLocal(coutingId, dataScoreFormated);
      };

      setTextHeader(t('home_textHeader_03'));
      sesetFlagsData([]);
      setFps(0);
      setCount(0);
      setCountCurrent(0);
      setMaleQuantity(0);
      setFemaleQuantity(0);
      setAcumuled(0);
      toastNative({
        title: 'Contagem Salva',
        description: (t('toast_description_01'));,
      });
    } catch (err) {
      console.log('Erro handleSave', err);
      try {
        const weightTotal = flagsData.reduce((accumulator, currentValue) => {
          return Number(accumulator) + Number(currentValue.weight);
        }, 0);

        const dataScores = {
          quantity: acumuled,
          weight: weightTotal,
          end_date: new Date(),
          updated_at: new Date(),
          markings: flagsData,
          status: false,
          male: maleQuantity,
          female: femaleQuantity,
        };

        handleUpdateLocal(coutingId, dataScores);
        toastNative({
          title: 'Contagem Salva',
          description: (t('toast_description_02'));,
        });
        setTextHeader(t('home_textHeader_03'));
        sesetFlagsData([]);
        setFps(0);
        setCount(0);
        setCountCurrent(0);
        setMaleQuantity(0);
        setFemaleQuantity(0);
        setAcumuled(0);
      } catch (er) {
        console.log('error', er);
        toastNative({
          title: 'Error',
          description: (t('toast_description_03'));,
        });
      }

    } finally {
      setLoading(false);
      setLoadingRoud(false);
      setLoadingSave(false);
    }
  }

  function handleUpdateLocal(scoreIdToUpdate: string, updatedData: any) {
    // Atualiza o score específico no estado local
    state.scores.set((currentScores) => {
      return currentScores.map((score) => {
        if (score.id === scoreIdToUpdate) {
          return { ...score, ...updatedData };
        }
        return score;
      });
    });
  }

  function handleDeleteLocal(scoreIdToDelete: string) {
    // Remove o score específico do estado local
    state.scores.set((currentScores) => {
      return currentScores.filter((score) => score.id !== scoreIdToDelete);
    });
  }

  async function handleDeleteCount() {
    try {
      if (!!netInfo.isConnected) {
        if (coutingId !== '') {
          if (digitalOnline) {
            await axios
              .delete(`https://node.pigtek.com.br/scores?id=${coutingId}`)
              .then(() => {
                toastNative({
                  title: 'Contagem excluida',
                  description: (t('toast_description_04'));,
                });
              });
          } else {
            handleDeleteLocal(coutingId);
            toastNative({
              title: 'Contagem excluida',
              description: (t('toast_description_04'));,
            });
          }
          setTextHeader(t('home_textHeader_03'));
          sesetFlagsData([]);
          setFps(0);
          setCount(0);
          setCountCurrent(0);
          setMaleQuantity(0);
          setFemaleQuantity(0);
          setAcumuled(0);
          setLoadingRoud(false);
        }
      } else {
        handleDeleteLocal(coutingId);
        setTextHeader(t('home_textHeader_03'));
        sesetFlagsData([]);
        setFps(0);
        setCount(0);
        setCountCurrent(0);
        setMaleQuantity(0);
        setFemaleQuantity(0);
        setAcumuled(0);
        setLoadingRoud(false);
        toastNative({
          title: 'Contagem excluida',
          description: (t('toast_description_04'));,
        });
      }
    } catch (err) {
      console.log('err', err);
      toastNative({
        title: 'Problemas ao excluir',
        description: (t('toast_description_05'));,
      });
    }
  }

  const handleStopProgram = () => {
    try {
      Alert.alert(
        'Parar contagem',
        'Realmente deseja finalizar esta contagem?',
        [
          {
            text: 'Cancelar',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          {
            text: 'Finalizar',
            onPress: () => {
              try {
                api.post(`/terminateProgram`);
              } catch (err) {
                console.log('err', err)
              }
            },
          },
        ],
        { cancelable: false }
      );
      
    } catch (err) {
      console.log('Erro handleStopProgram', err);
    } finally {
      setLoading(false);
      setLoadingRoud(false);
    }
  };

  useEffect(() => {
    if (dataConfig?.markingAutomatic === 'yes') {
      if (count % Number(dataConfig.rangeForMarking) === 0) {
        handleCreateFlag();
      }
    }
  }, [count]);

  async function handleCreateFlag() {
    try {
      const idMarkings = uuid.v4();
      if (count >= 0) {
        // await api.get(`/scale/${balance}`).then((res) => {
        sesetFlagsData([
          ...flagsData,
          {
            quantity: countCurrent,
            sequence: flagsData.length + 1,
            weight: 0,
            score_id: coutingId,
            id: String(idMarkings),
            created_at: String(new Date()),
            updated_at: String(new Date()),
            gender: sexRef.current,
          },
        ]);
        // });
        setCountCurrent(0);
      }
    } catch (err) {
      alert(t('alert_error_balance_01'));
    }
  }

  const handleDeleteFlag = (flagSequence: number) => {
    Alert.alert(t(
      'alert_markup_01')),
      (t('alert_markup_02')),
      [
        {
          text: (t('alert_markup_03')),
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: (t('alert_markup_04')),
          onPress: () => handleDeleteFalgPassedAlert(flagSequence),
        },
      ],
      { cancelable: false }
    );
  };

  const handleDeleteFalgPassedAlert = (flagSequence: number) => {
    const filtred = flagsData.filter((item) => item.sequence !== flagSequence);
    sesetFlagsData(filtred);
  };

  function handleRunCamera() {
    navigation.navigate('camera');
  }

  async function changeScreenOrientation() {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.DEFAULT
    );
  }

  useFocusEffect(
    useCallback(() => {
      changeScreenOrientation();
    }, [])
  );

  const handleOpenModal = useCallback((sequence: string) => {
    setModalVisible(!modalVisible)
    setFlagOpen(sequence)
  }, [])

  useEffect(() => {
    if (flatListRef.current) {
      (flatListRef.current as any).scrollToEnd({ animated: true });
    }
  }, [flagsData]);

  const renderItem = ({ item, index }: any) => {
    return (
      <TouchableOpacity onLongPress={() => handleDeleteFlag(item.sequence)} onPress={() => handleOpenModal(item.sequence)}>
        <SectionList style={index === flagsData.length - 1 && styles.lastItemHighlight} >
          <Ionicons name="flag" size={15} color={index === flagsData.length - 1 ? 'white' : 'grey'} />
          <TextFlag style={index === flagsData.length - 1 && styles.textItem}>Marcação: {item.sequence}</TextFlag>
          <TextFlag style={index === flagsData.length - 1 && styles.textItem}>Quantidade: {item.quantity}</TextFlag>
          <TextFlag style={index === flagsData.length - 1 && styles.textItem}>Peso: {Number(item.weight)} Kg</TextFlag>
        </SectionList>
      </TouchableOpacity>
    );
  };

  function handleReturnOptions() {
    navigation.navigate('options');
  }

  function handleSetQuantityCount(type: string) {
    if (type === 'add') {
      if (sex === 'male') {
        setAcumuled(acumuled + 1)
        setCountCurrent(countCurrent + 1)
        setMaleQuantity(maleQuantity + 1)
        socket.current?.send('add');

      } else {
        setAcumuled(acumuled + 1)
        setCountCurrent(countCurrent + 1)
        setFemaleQuantity(femaleQuantity + 1)
        socket.current?.send('add');

      }
    } else if (type === 'remove') {
      if (sex === 'male') {
        setAcumuled(acumuled - 1)
        setCountCurrent(countCurrent - 1)
        setMaleQuantity(maleQuantity - 1)
        socket.current?.send('subtract');
      } else {
        setAcumuled(acumuled - 1)
        setCountCurrent(countCurrent - 1)
        setFemaleQuantity(femaleQuantity - 1)
        socket.current?.send('subtract');
      }
    }

  }

  return (
    <>
      <SectionCamera>
        <ButtonReturn onPress={handleReturnOptions}>
          <Ionicons name="arrow-back" size={25} color="white" />
        </ButtonReturn>
        <ModalWeight modalVisible={modalVisible} setModalVisible={setModalVisible} sesetFlagsData={sesetFlagsData} flagsData={flagsData} setFlagOpen={setFlagOpen} flagOpen={flagOpen} />
        <Camera url={url} textHeader={textHeader} />
      </SectionCamera>
      <Container>
        {type === 'destination_with_count' && (
          <TitleNameProd>
            Contagem: {loteFormated} - {productorName}
          </TitleNameProd>
        )}
        {type === 'simple_count' && (
          <TitleNameProd>
            Contagem: {loteFormated} - {name !== '' ? name : 'titleName_01'}
          </TitleNameProd>
        )}
        <Header title={textHeader} />
        <TextCount>{countCurrent}</TextCount>
        <TextFps>(t('text_fps_01')) {acumuled}!</TextFps>
        {/* <TextFps>FPS: {fps}!</TextFps> */}
        <TextFps>(t('text_fps_02')) {acumuled} (♂ {maleQuantity} / ♀ {femaleQuantity})!</TextFps>
      </Container>
      <ContainerFlag>
        <SectionFlag>
          <FlatList data={flagsData} ref={flatListRef} renderItem={renderItem} keyExtractor={(item) => item.id.toString()} />
        </SectionFlag>
      </ContainerFlag>

      {loading && textHeader === (t('home_textHeader_01'))? (
        <SectionPlus>
          <ButtonTrasparent onPress={() => handleSetQuantityCount('remove')}>
            <Ionicons name="remove" size={iconSize} color="white" />
          </ButtonTrasparent>

          <ButtonTrasparent onPress={() => handleSetQuantityCount('add')}>
            <Ionicons name="add" size={iconSize} color="white" />
          </ButtonTrasparent>
        </SectionPlus>

      ) : (
        ''
      )}


      <Section>
        {loading && textHeader === (t('home_textHeader_01')) ? (
          <>
            <ButtonYellow onPress={handleCreateFlag}>
              <Ionicons name="flag" size={iconSize} color="white" />
            </ButtonYellow>

            <ButtonBlue onPress={handleStopProgram}>
              <Ionicons name="stop" size={iconSize} color="white" />
            </ButtonBlue>

            {sex === 'male' ? (
              <ButtonBlue onPress={toggleSex}>
                <TextFps>Macho</TextFps>
              </ButtonBlue>
            ) : (
              <ButtonPink onPress={toggleSex}>
                <TextFps>Fêmea</TextFps>
              </ButtonPink>
            )}
          </>
        ) : (
          ''
        )}
        {textHeader === (t('home_textHeader_03')) ? (
          <Button
            color="green"
            onPress={handleRoudProgram}
            disabled={loading || loadingRoud}
          >
            {loadingRoud ? (
              <ActivityIndicator size="large" />
            ) : (
              <Ionicons name="play" size={iconSize} color="white" />
            )}
          </Button>
        ) : (
          ''
        )}
        {textHeader === (t('home_textHeader_02')) ? (
          <>
            <ButtonRed
              onPress={handleDeleteCount}
              disabled={loading || loadingSave}
            >
              {loadingSave ? (
                <ActivityIndicator size="large" />
              ) : (
                <Ionicons name="trash" size={iconSize} color="white" />
              )}
            </ButtonRed>
            <Button
              color="green"
              onPress={handleContinuosProgram}
              disabled={loading || loadingRoud}
            >
              {loadingRoud || loadingSave ? (
                <ActivityIndicator size="large" />
              ) : (
                <Ionicons name="play-forward" size={iconSize} color="white" />
              )}
            </Button>
            <ButtonBlue onPress={handleSave} disabled={loading || loadingSave}>
              {loadingSave ? (
                <ActivityIndicator size="large" />
              ) : (
                <Ionicons name="save" size={iconSize} color="white" />
              )}
            </ButtonBlue>
          </>
        ) : (
          ''
        )}
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  lastItemHighlight: {
    backgroundColor: '#2ced966c', // Cor de fundo para o último item
    borderRadius: 6,
    padding: 8,
    alignItems: 'center'
  },
  textItem: {
    fontWeight: '700',
    fontSize: 14,
    color: '#fff',
  }
});
