import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { RoadmapsService } from '../roadmaps/roadmaps.service';

@Injectable()
export class AiService {
  private client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly roadmapsService: RoadmapsService,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateRoadmap(
    userId: string,
    data: {
      level: string;
      goal: string;
      hours: number;
      selectedInterests: string[];
    },
  ) {
    const levelMap: Record<string, string> = {
      beginner: '입문 (해당 분야를 처음 접함)',
      novice: '초급 (기본 개념만 알고 있음)',
      intermediate: '중급 (간단한 프로젝트 경험 있음)',
      advanced: '고급 (실무 경험 있음)',
    };

    const prompt = `당신은 개인 맞춤형 학습 로드맵을 설계하는 전문 교육 컨설턴트입니다.

다음 정보를 바탕으로 학습 로드맵을 JSON 형식으로 생성해주세요.

## 학습자 정보
- 현재 수준: ${levelMap[data.level] ?? data.level}
- 최종 목표: ${data.goal}
- 주당 학습 가능 시간: ${data.hours}시간
- 관심 분야: ${data.selectedInterests.join(', ')}

## 요구사항
- 주당 ${data.hours}시간 기준으로 현실적인 주차별 학습량 설정
- 각 주차는 명확한 학습 테마와 목표를 가져야 함
- 초급자는 4~6주, 중급자는 6~10주, 고급자는 8~12주 정도로 구성
- 각 주차마다 3~5개의 실습 가능한 태스크 포함
- 각 주차마다 2~4개의 학습 자료 포함

## 응답 형식 (JSON만 반환, 다른 텍스트 없이)
{
  "title": "로드맵 제목",
  "goal": "최종 목표",
  "weeks": [
    {
      "theme": "주차 테마",
      "description": "이번 주 학습 내용 설명 (2~3문장)",
      "estimatedHours": 숫자,
      "tasks": [{ "title": "태스크 제목" }],
      "resources": [{ "title": "자료 제목", "url": "URL 또는 #", "type": "video | doc | article" }]
    }
  ]
}`;

    const message = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다');

    const aiData = JSON.parse(jsonMatch[0]);
    return this.roadmapsService.createFromAI(userId, aiData);
  }

  async replan(
    userId: string,
    data: {
      roadmapId: string;
      currentWeek: number;
      completedTasks: string[];
      remainingWeeks: number;
    },
  ) {
    const roadmap = await this.roadmapsService.findOne(data.roadmapId, userId);

    const remainingWeekList = roadmap.weeks
      .filter((w) => w.weekNumber >= data.currentWeek)
      .map((w) => `${w.weekNumber}주차: ${w.theme} (${w.estimatedHours}h)`)
      .join('\n');

    const prompt = `당신은 학습 일정을 재조정하는 전문 코치입니다.

## 현재 상황
- 로드맵: ${roadmap.title}
- 목표: ${roadmap.goal}
- 현재 진행 주차: ${data.currentWeek}주차
- 남은 주차 수: ${data.remainingWeeks}주
- 완료한 태스크: ${data.completedTasks.length}개

## 기존 남은 주차 계획
${remainingWeekList}

## 요구사항
- 현재 진도와 남은 시간을 고려해 현실적으로 재조정
- 중요한 내용 유지하되 부담이 적게 분산
- ${data.remainingWeeks}주 분량으로 재구성

## 응답 형식 (JSON만 반환)
{
  "weeks": [
    {
      "theme": "주차 테마",
      "description": "설명",
      "estimatedHours": 숫자,
      "tasks": [{ "title": "태스크" }],
      "resources": [{ "title": "자료", "url": "#", "type": "doc" }]
    }
  ]
}`;

    const message = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다');

    const aiData = JSON.parse(jsonMatch[0]);
    return this.roadmapsService.replaceWeeksFromAI(
      data.roadmapId,
      userId,
      data.currentWeek,
      aiData.weeks,
    );
  }
}
