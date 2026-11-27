import { Component, type ReactNode } from 'react';
import { Text } from 'react-native';

// Faz o papel do limite de erro do app nos testes de tela: mostra a falha em vez de derrubar o teste.
export class LimiteDeErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  render() {
    const { erro } = this.state;
    return erro ? <Text>{`Caiu: ${erro.message}`}</Text> : this.props.children;
  }
}
