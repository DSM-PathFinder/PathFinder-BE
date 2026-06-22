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
- 초급자는 4~6주, 중급자는 6~10주, 고급자는 8~12주 구성
- 각 주차마다 3~5개의 실습 가능한 태스크 포함
- 각 주차마다 2~4개의 학습 자료 포함
- 반드시 아래 JSON 형식만 반환하고 다른 텍스트는 절대 포함하지 마세요

## 반환 형식 (JSON만, 마크다운 코드블록 없이)
{"title":"로드맵 제목","goal":"최종 목표","weeks":[{"theme":"주차 테마","description":"설명","estimatedHours":10,"tasks":[{"title":"태스크"}],"resources":[{"title":"자료 제목","url":"#","type":"doc"}]}]}`;

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('');

    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    }

    const jsonStr = cleaned.slice(start, end + 1);
    const aiData = JSON.parse(jsonStr);
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

    const prompt = `학습 일정을 재조정해주세요.

## 현재 상황
- 로드맵: ${roadmap.title}
- 목표: ${roadmap.goal}
- 현재 진행 주차: ${data.currentWeek}주차
- 남은 주차 수: ${data.remainingWeeks}주

## 기존 남은 주차
${remainingWeekList}

반드시 아래 JSON 형식만 반환하고 다른 텍스트는 절대 포함하지 마세요.
{"weeks":[{"theme":"주차 테마","description":"설명","estimatedHours":10,"tasks":[{"title":"태스크"}],"resources":[{"title":"자료","url":"#","type":"doc"}]}]}`;

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('');

    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1)
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');

    const aiData = JSON.parse(cleaned.slice(start, end + 1));
    return this.roadmapsService.replaceWeeksFromAI(
      data.roadmapId,
      userId,
      data.currentWeek,
      aiData.weeks,
    );
  }
}
