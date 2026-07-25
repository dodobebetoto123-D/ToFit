### 1\. User (사용자 정보) 테이블 정의

*   **ID**: PK, UUID 또는 Auto-Increment BigInt
*   **Email**: VARCHAR(255), Unique, 이메일 형식 검증 필수
*   **Password**: VARCHAR(255), 암호화되어 저장될 필드
*   **Nickname**: VARCHAR(50), 앱 내 활동명, Unique
*   **Gender**: Enum ('MALE', 'FEMALE', 'UNISEX')
*   **Height**: DECIMAL(5, 2), 단위(cm)
*   **Weight**: DECIMAL(5, 2), 단위(kg)
*   **PersonalColor**: Enum ('SPRING\_WARM', 'SUMMER\_COOL', 'AUTUMN\_WARM', 'WINTER\_COOL')
*   **PreferredStyle**: VARCHAR(100) 또는 별도 스타일에 대한 다중 선택값 저장 구조(JSONB/Array 타입 권장)
*   **Timestamps**: created\_at, updated\_at

###   

### 2\. Clothes (사용자 개인 옷장) 테이블 정의

*   **ID**: PK
*   **UserID**: FK (User 테이블 참조, Cascade Delete)
*   **Name**: VARCHAR(100), 옷의 상품명 또는 별칭
*   **MajorCategory**: Enum ('TOP', 'BOTTOM', 'OUTER', 'SHOES', 'BAG', 'ACCESSORY')
*   **MinorCategory**: Enum ('T\_SHIRT', 'SHIRT', 'SWEATER', 'HOODIE', 'SLACKS', 'DENIM', 'SKIRT', 'CARDIGAN', 'COAT', 'JACKET' 등 상세 분류)
*   **Style**: VARCHAR(50), 해당 옷의 무드 (예: 캐주얼, 미니멀, 스트릿, 아메카지)
*   **Color**: VARCHAR(7), HEX 코드 형식 또는 대표 색상 Enum
*   **Material**: Enum ('COTTON', 'LINEN', 'DENIM', 'WOOL', 'LEATHER', 'POLYSTER', 'NYLON' 등)
*   **Thickness**: Enum ('THIN', 'MEDIUM', 'THICK')
*   **Seasons**: Array 또는 Enum Set ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER') - 다중 선택 가능하도록 설계
*   **PhotoURL**: VARCHAR(512), 옷 사진 이미지 스토리지(S3 등) 주소
*   **IsPreferred**: BOOLEAN, Default: FALSE (사용자가 자주 입는 선호 옷 여부)
*   **Timestamps**: created\_at, updated\_at
*   **Schedule\_Situation (사용자 등록 상황 및 기상 일정)**
*   id: PK (UUID)
*   user\_id: FK (User.id)
*   event\_date: DATE, Not Null (일정 날짜)
*   location\_latitude: DECIMAL(10, 8), Nullable (기상 API 조회를 위한 위도)
*   location\_longitude: DECIMAL(11, 8), Nullable (기상 API 조회를 위한 경도)
*   situation\_tag: ENUM('CAMPUS', 'OFFICE', 'DATE', 'WEDDING', 'WORKOUT', 'CASUAL', 'TRAVEL'), Not Null (TPO 태그)
*   temperature\_high: DECIMAL(3, 1), Nullable (당일 최고 기온)
*   temperature\_low: DECIMAL(3, 1), Nullable (당일 최저 기온)
*   weather\_status: VARCHAR(50), Nullable (맑음, 비, 눈 등 기상 상태 정보)

### 3\. Coordinate (AI 학습 및 추천 코디 세트) 테이블 정의

*   **ID**: PK
*   **StyleName**: VARCHAR(100), 코디 스타일 명칭 (예: '캠퍼스 남친룩', '시크 비즈니스 캐주얼')
*   **MinTemperature**: DECIMAL(4, 1), 해당 코디를 입을 수 있는 최소 적정 기온
*   **MaxTemperature**: DECIMAL(4, 1), 해당 코디를 입을 수 있는 최대 적정 기온
*   **Situation**: Enum ('DAILY', 'DATE', 'WORK', 'SPORT', 'TRAVEL' 등 옷을 입는 상황 정보)
*   body\_shape\_compatibility: JSON, Nullable (체형별 추천도 가중치 정보)
*     
    
*   **ColorPalette**: JSONB 또는 Array (코디를 구성하는 주요 HEX 코드 배열)
*   **IsGoodCoord**: BOOLEAN, AI 학습용 라벨 (해당 조합이 패션 관점에서 좋은 코디인지 나쁜 코디인지 구분하는 플래그)
*   **Timestamps**: created\_at

### 4\. CoordinateItem (코디 상세 구성품 매핑) 테이블 정의

*   _Coordinate 테이블과 Clothes 카테고리 간의 관계 혹은 구체적인 Clothes 아이템 간의 다대다(N:M) 관계를 정의합니다._
*   **ID**: PK
*   **CoordinateID**: FK (Coordinate 테이블 참조)
*   **MajorCategory**: Enum (코디에 필요한 대분류군 정보)
*   **MinorCategory**: Enum (코디에 필요한 소분류군 정보)
*   **RequiredColor**: VARCHAR(7) (매칭 시 권장되는 색상 조건, Null 허용)

### 5\. CommunityPost (커뮤니티 공유) 테이블 정의

*   **ID**: PK
*   **UserID**: FK (User 테이블 참조)
*   **Title**: VARCHAR(200)
*   **Content**: TEXT
*   **ViewCount**: INT, Default: 0
*   **LikeCount**: INT, Default: 0
*   **OutfitPhotoURL**: VARCHAR(512), 실제 착장 사진
*   **Timestamps**: created\_at, updated\_at

### 6\. CommunityPostItem (커뮤니티 게시글 내 착장 정보 매핑) 테이블 정의

*   _커뮤니티 게시글에 태그된 실제 사용자의 옷 정보 및 코디 정보를 연결하는 테이블입니다._
*   **ID**: PK
*   **PostID**: FK (CommunityPost 테이블 참조, Cascade Delete)
*   Postname: 게시글 제목
*   post date: 게시글 날짜
*   Post like: 게시글 좋아요수
*   Postwriter: 게시글 작성자
*   **ClothesID**: FK (Clothes 테이블 참조, Null 허용 - 정보가 없을 수 있음)
*   **BrandName**: VARCHAR(100), 브랜드명 직접 입력 대비용 필드

### 7\. 인덱스 및 제약조건 설정 (성능 최적화)

*   User의 Email 및 Nickname에에 Unique 인덱스 설정
*   Clothes 테이블의 UserID 필드에 FK 인덱스 추가 (조회 성능 최적화)
*   Coordinate 테이블의 MinTemperature, MaxTemperature 복합 인덱스 설정 (날씨 기반 기온 필터링 속도 향상)

**8\. Cody\_Item\_Bridge (코디 제안 상세 구성 N:M 관계 테이블)**

*   id: PK (BigInt)
*   recommendation\_id: FK (Cody\_Recommendation.id, Cascade Delete)
*   cloth\_id: FK (Cloth.id) (사용자 옷장에서 매칭된 개별 아이템)
*   다음 서비스 배경 정보 및 요구사항을 바탕으로 \*\*RDBMS(PostgreSQL 기준) 데이터베이스 스키마(DDL 또는 Prisma/JPA Entity 코드)\*\*를 설계하고 생성해 주세요.
*   각 테이블의 컬럼명은 카멜케이스(CamelCase) 또는 스네이크케이스(SnakeCase) 중 백엔드 표준에 맞추어 작성하고, 외래키(FK) 관계를 명확히 정의해 주세요.
*   옷 카테고리, 체형, 퍼스널 컬러, 계절 등 고정된 범위의 값들은 **Enum 타입**을 정의하여 데이터 정합성을 보장해 주세요.

**9\. 옷 브랜드 및 상품명을 기억함. (공통적으로 기억해야 할 것)**

(사람들이 등록한 코디의 브랜드, 상의 하의, 등 카테고리와 브랜드별로 분류해서 저장한다. )

\-옷의 상품명

\-옷의 브랜드

\-옷의 대분류(상의, 하의, 외투)

\-옷의 소분류(가디건, 샌들, 볼캡)

\-옷 등록자의 키, 몸무게, 성별 등의 정보

10.